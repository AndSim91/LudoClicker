import { describe, expect, it, vi } from "vitest";
import { processAutomaticTeaching } from "./automationFlow";
import { createInitialState } from "./engine";
import {
  getActiveCampaignEmails,
  getAvailableContactCount,
  getContactsAwaitingEmailCount,
  getCompletedTrialsByStartDay,
  getCompletedTrialsByMostRecent,
  getCollaboratorsByContactId,
  getContactsById,
  getInstructorTeachingCounts,
  getDayTrials,
  getDirectEnrollmentContacts,
  getBusyEventCollaboratorIds,
  getNextPendingEmailOutcomeDeadline,
  getNextRunningEventDeadline,
  getNextScheduledTrialDeadline,
  getNextSendingEmailDeadline,
  getNextTrainingDeadline,
  getRunningEventDefinitionIds,
  getScheduledTrials,
  getScheduledTrialsByStart,
  getWaitingTrainingsByPriority,
} from "./runtimeIndexes";
import { resolveTrial } from "./trialFlow";
import type { Contact, ScheduledTrial } from "./types";

describe("runtime indexes", () => {
  it("indexes collaborators by contact once per source array", () => {
    const collaborators = createInitialState(1_000).collaborators;
    const index = getCollaboratorsByContactId(collaborators);

    expect(getCollaboratorsByContactId(collaborators)).toBe(index);
    expect(getCollaboratorsByContactId([...collaborators])).not.toBe(index);
  });

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
    const dayStart = new Date(2026, 6, 19).getTime();
    const dayTrials = getDayTrials(trials, dayStart);
    expect(getScheduledTrialsByStart(trials)).toBe(scheduled);
    expect(getCompletedTrialsByStartDay(trials)).toBe(historyByDay);
    expect(getDayTrials(trials, dayStart)).toBe(dayTrials);
    expect(scheduled.map((trial) => trial.id)).toEqual(["earlier", "later"]);
    expect([...historyByDay.values()].flat().map((trial) => trial.id)).toEqual(["today"]);
    expect(dayTrials.map((trial) => trial.id)).toEqual(["today", "earlier", "later"]);
  });

  it("indexes direct enrollments once per contacts and trials pair", () => {
    const initial = createInitialState(1_000);
    const contacts = initial.contacts.slice(0, 3).map((contact, index) => ({
      ...contact,
      acquiredAt: 1_000 + index,
      status: "enrolled" as const,
    }));
    const trials: ScheduledTrial[] = [{
      id: "enrollment-with-trial",
      contactId: contacts[1].id,
      startsAt: 2_000,
      resolvesAt: 3_000,
      resultSeed: 1,
      status: "completed",
    }];

    const directEnrollments = getDirectEnrollmentContacts(contacts, trials);

    expect(getDirectEnrollmentContacts(contacts, trials)).toBe(directEnrollments);
    expect(directEnrollments.map((contact) => contact.id)).toEqual([
      contacts[2].id,
      contacts[0].id,
    ]);
    expect(getDirectEnrollmentContacts(contacts, [...trials])).not.toBe(directEnrollments);
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
      index < 2
        ? {
            ...contact,
            training: {
              formId: "form-1" as const,
              startedAt: 1_000,
              completesAt: 2_000,
              ...(index === 0
                ? { instructorId }
                : {
                    requestedInstructorId: instructorId,
                    status: "waitingForEquipment" as const,
                  }),
            },
          }
        : contact,
    );

    const contactsById = getContactsById(contacts);
    const loads = getInstructorTeachingCounts(contacts, initial.collaborators);
    expect(getContactsById(contacts)).toBe(contactsById);
    expect(getInstructorTeachingCounts(contacts, initial.collaborators)).toBe(loads);
    expect(contactsById.get(contacts[0].id)).toBe(contacts[0]);
    expect(loads.get(instructorId)).toBe(2);
  });

  it("caches queue deadlines, event sets and chronological waiting lessons", () => {
    const initial = createInitialState(1_000);
    const emails = initial.emails.map((email) => ({
      ...email,
      status: "sending" as const,
      sendCompletesAt: 4_000,
    }));
    const outcomes = [{
      id: "outcome",
      emailId: emails[0].id,
      contactId: initial.contacts[0].id,
      resolvesAt: 3_000,
      result: "lost" as const,
    }];
    const trials: ScheduledTrial[] = [{
      id: "trial",
      contactId: initial.contacts[0].id,
      startsAt: 2_000,
      resolvesAt: 5_000,
      resultSeed: 1,
      status: "scheduled",
    }];
    const events = [{
      id: "event",
      definitionId: "park-sparring" as const,
      title: "Evento",
      location: "Test",
      startedAt: 1_000,
      resolvesAt: 6_000,
      cost: 0,
      peopleMet: 0,
      demonstrationsGiven: 0,
      contactReward: 0,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      collaboratorId: "event-worker",
      status: "running" as const,
    }];
    const contacts = initial.contacts.slice(0, 2).map((contact, index) => ({
      ...contact,
      training: {
        formId: "form-1" as const,
        startedAt: 20 - index,
        completesAt: index === 0 ? 7_000 : 8_000,
        status: index === 0 ? "running" as const : "waitingForEquipment" as const,
      },
    }));

    expect(getNextSendingEmailDeadline(emails)).toBe(4_000);
    expect(getNextPendingEmailOutcomeDeadline(outcomes)).toBe(3_000);
    expect(getNextScheduledTrialDeadline(trials)).toBe(2_000);
    expect(getNextRunningEventDeadline(events)).toBe(6_000);
    expect(getNextTrainingDeadline(contacts)).toBe(7_000);
    expect(getRunningEventDefinitionIds(events)).toBe(getRunningEventDefinitionIds(events));
    expect(getBusyEventCollaboratorIds(events)).toBe(getBusyEventCollaboratorIds(events));

    const waiting = getWaitingTrainingsByPriority(contacts, initial.collaborators);
    expect(getWaitingTrainingsByPriority(contacts, initial.collaborators)).toBe(waiting);
    expect(waiting.map((person) => person.id)).toEqual([contacts[1].id]);
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
      school: { ...initial.school, activeMembers: 1, fame: 1 },
      scheduledTrials: [...completedTrials, trial],
    };

    const resolved = resolveTrial(state, trial, 2_000, 1);
    expect(resolved.scheduledTrials.at(-1)?.status).toBe("completed");
    expect(resolved.statistics.trialsCompleted).toBe(initial.statistics.trialsCompleted + 1);
  });
});
