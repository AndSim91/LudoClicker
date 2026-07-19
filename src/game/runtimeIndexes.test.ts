import { describe, expect, it, vi } from "vitest";
import { processAutomaticTeaching } from "./automationFlow";
import { createInitialState } from "./engine";
import {
  getActiveCampaignEmails,
  getAvailableContactCount,
  getContactsAwaitingEmailCount,
  getCompletedTrialsByStartDay,
  getCompletedTrialsByMostRecent,
  getContactsById,
  getInstructorTeachingCounts,
  getScheduledTrials,
  getScheduledTrialsByStart,
} from "./runtimeIndexes";
import { resolveTrial } from "./trialFlow";
import type { Contact, ScheduledTrial } from "./types";

describe("runtime indexes", () => {
  it("reuses derived collections until their source identity changes", () => {
    const trials: ScheduledTrial[] = [
      { id: "old", contactId: "a", startsAt: 1, resolvesAt: 2, resultSeed: 1, status: "completed" },
      { id: "next", contactId: "b", startsAt: 3, resolvesAt: 4, resultSeed: 2, status: "scheduled" },
    ];

    const scheduled = getScheduledTrials(trials);
    const completed = getCompletedTrialsByMostRecent(trials);
    expect(getScheduledTrials(trials)).toBe(scheduled);
    expect(getCompletedTrialsByMostRecent(trials)).toBe(completed);
    expect(scheduled.map((trial) => trial.id)).toEqual(["next"]);

    const replacement = trials.map((trial) => ({ ...trial }));
    expect(getScheduledTrials(replacement)).not.toBe(scheduled);
    expect(getCompletedTrialsByMostRecent(replacement)).not.toBe(completed);
  });

  it("keeps the active email lookup stable while the archive is unchanged", () => {
    const initial = createInitialState(1_000);
    const archived = Array.from({ length: 10_000 }, (_, index) => ({
      ...initial.emails[0],
      id: `archived-${index}`,
      status: "lost" as const,
    }));
    const emails = [...archived, initial.emails[0]];
    const active = getActiveCampaignEmails(emails);

    expect(active).toEqual([initial.emails[0]]);
    expect(getActiveCampaignEmails(emails)).toBe(active);
  });

  it("indexes available contacts and calendar history once per source array", () => {
    const initial = createInitialState(1_000);
    const contacts = initial.contacts.map((contact, index) => ({
      ...contact,
      status: index < 2 ? "available" as const : "lost" as const,
    }));
    const now = new Date(2026, 6, 19, 12).getTime();
    const trials: ScheduledTrial[] = [
      { id: "later", contactId: "a", startsAt: now + 2_000, resolvesAt: now + 3_000, resultSeed: 1, status: "scheduled" },
      { id: "today", contactId: "b", startsAt: now - 2_000, resolvesAt: now - 1_000, resultSeed: 2, status: "completed" },
      { id: "earlier", contactId: "c", startsAt: now + 1_000, resolvesAt: now + 2_000, resultSeed: 3, status: "scheduled" },
    ];

    expect(getAvailableContactCount(contacts)).toBe(2);
    expect(getAvailableContactCount(contacts)).toBe(2);
    const scheduled = getScheduledTrialsByStart(trials);
    const historyByDay = getCompletedTrialsByStartDay(trials);
    expect(getScheduledTrialsByStart(trials)).toBe(scheduled);
    expect(getCompletedTrialsByStartDay(trials)).toBe(historyByDay);
    expect(scheduled.map((trial) => trial.id)).toEqual(["earlier", "later"]);
    expect([...historyByDay.values()].flat().map((trial) => trial.id)).toEqual(["today"]);
  });

  it("keeps the active draft in the count until its email is sent", () => {
    const initial = createInitialState(1_000);

    expect(getAvailableContactCount(initial.contacts)).toBe(4);
    expect(getContactsAwaitingEmailCount(initial.contacts)).toBe(5);

    const lastDraft = initial.contacts.map((contact) => ({
      ...contact,
      status: contact.status === "writing" ? "writing" as const : "lost" as const,
    }));
    expect(getAvailableContactCount(lastDraft)).toBe(0);
    expect(getContactsAwaitingEmailCount(lastDraft)).toBe(1);
  });

  it("builds contact and instructor indexes once per pair of source arrays", () => {
    const initial = createInitialState(1_000);
    const instructorId = "cached-instructor";
    const contacts = initial.contacts.map((contact, index) =>
      index === 0
        ? {
            ...contact,
            training: {
              formId: "form-1" as const,
              startedAt: 1_000,
              completesAt: 2_000,
              instructorId,
            },
          }
        : contact,
    );

    const contactsById = getContactsById(contacts);
    const loads = getInstructorTeachingCounts(contacts, initial.collaborators);
    expect(getContactsById(contacts)).toBe(contactsById);
    expect(getInstructorTeachingCounts(contacts, initial.collaborators)).toBe(loads);
    expect(contactsById.get(contacts[0].id)).toBe(contacts[0]);
    expect(loads.get(instructorId)).toBe(1);
  });

  it("memoizes automatic-teaching no-ops but invalidates them on relevant input", () => {
    const initial = createInitialState(1_000);
    let contactScans = 0;
    const contacts = new Proxy(initial.contacts, {
      get(target, property, receiver) {
        if (property === "filter") contactScans += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    const state = {
      ...initial,
      contacts,
      unlocks: { ...initial.unlocks, forms: true },
      collaborators: [{
        id: "cache-instructor",
        contactId: "cache-instructor-contact",
        displayName: "Cache Instructor",
        joinedAt: 1_000,
        forms: ["form-1" as const],
        instructorForms: ["form-1" as const],
        assignment: "instructor" as const,
        rarity: "ultra-rare" as const,
      }],
    };
    const startTraining = vi.fn((currentState) => currentState);

    expect(processAutomaticTeaching(state, 2_000, startTraining)).toBe(state);
    const scansAfterFirstAttempt = contactScans;
    expect(processAutomaticTeaching({ ...state }, 2_250, startTraining)).toEqual(state);
    expect(contactScans).toBe(scansAfterFirstAttempt);

    processAutomaticTeaching(
      { ...state, school: { ...state.school, euros: state.school.euros + 1 } },
      2_500,
      startTraining,
    );
    expect(contactScans).toBeGreaterThan(scansAfterFirstAttempt);
    expect(startTraining).not.toHaveBeenCalled();
  });

  it("resolves a trial without nested linear contact searches", () => {
    const initial = createInitialState(1_000);
    const currentContact = {
      ...initial.contacts[0],
      status: "trialScheduled" as const,
    };
    const enrolledContact = {
      ...initial.contacts[1],
      status: "enrolled" as const,
    };
    const padding = Array.from({ length: 500 }, (_, index): Contact => ({
      ...initial.contacts[2],
      id: `archived-contact-${index}`,
      status: "lost",
    }));
    const contacts = new Proxy([currentContact, enrolledContact, ...padding], {
      get(target, property, receiver) {
        if (property === "some") {
          throw new Error("resolveTrial must use the contact index, not a nested scan");
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const completedTrials: ScheduledTrial[] = Array.from(
      { length: 500 },
      (_, index) => ({
        id: `completed-${index}`,
        contactId: index === 499 ? enrolledContact.id : padding[index].id,
        startsAt: index,
        resolvesAt: index + 1,
        resultSeed: index,
        status: "completed",
      }),
    );
    const trial: ScheduledTrial = {
      id: "current",
      contactId: currentContact.id,
      startsAt: 1_500,
      resolvesAt: 2_000,
      resultSeed: 0,
      status: "scheduled",
    };
    const state = {
      ...initial,
      contacts,
      school: { ...initial.school, activeMembers: 1, historicMembers: 1 },
      scheduledTrials: [...completedTrials, trial],
    };

    const resolved = resolveTrial(state, trial, 2_000, 1);
    expect(resolved.scheduledTrials.at(-1)?.status).toBe("completed");
    expect(resolved.statistics.trialsCompleted).toBe(initial.statistics.trialsCompleted + 1);
  });
});
