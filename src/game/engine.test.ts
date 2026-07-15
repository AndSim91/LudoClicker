import { describe, expect, it } from "vitest";
import { PROSPECT_EMAIL_PROVIDERS } from "../content/prospectDirectory";
import { getAcquisitionEventDefinition } from "../content/events";
import { GAME_CONFIG } from "./config";
import { canFoundSchool, createInitialState, gameReducer, getLegendaryAppearanceChance, getLegendaryEnrollmentChance, getPrestigeRequirements } from "./engine";
import { getEmailBookingChance, getEnrollmentChance, getEventFunnelOutcome, getMemberAnnualDepartureChance } from "./formulas";
import { NARRATIVE_EVENTS } from "../content/narrativeEvents";
import { PERSON_RARITIES } from "../content/rarities";
import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import { getAvailableForms, getCollaboratorProductivity } from "../content/forms";
import type { FormId } from "./types";
import {
  selectActiveEmail,
  selectIncomePerMonth,
  selectSentEmailStatus,
  selectUnreadMessages,
} from "./selectors";

describe("game engine", () => {
  it("creates a playable tutorial state", () => {
    const state = createInitialState(1_000);

    expect(state.contacts).toHaveLength(5);
    expect(state.contacts.filter((contact) => contact.status === "available")).toHaveLength(4);
    expect(state.contacts.every((contact) =>
      PROSPECT_EMAIL_PROVIDERS.includes(
        contact.email.split("@")[1] as (typeof PROSPECT_EMAIL_PROVIDERS)[number],
      )
    )).toBe(true);
    expect(selectActiveEmail(state)?.status).toBe("writing");
    expect(state.school.euros).toBe(0);
    expect(state.contacts.every((contact) => contact.rarity !== "legendary")).toBe(true);
    expect(PERSON_RARITIES.common.emailShareChance).toBe(0.7);
    expect(PERSON_RARITIES.legendary.queueAppearanceChance).toBe(0.05);
    expect(getEnrollmentChance(state, "common")).toBe(0.4);
    expect(getEnrollmentChance(state, "legendary")).toBe(0.025);
  });

  it("reveals only the configured amount of predetermined text", () => {
    const state = createInitialState(1_000);
    const email = selectActiveEmail(state)!;
    const faster = { ...state, player: { writingPower: 2 } };
    const next = gameReducer(faster, { type: "WRITE", now: 2_000 });

    expect(selectActiveEmail(next)?.revealedCharacters).toBe(2);
    expect(selectActiveEmail(next)?.body.slice(0, 2)).toBe(email.body.slice(0, 2));
    expect(next.statistics.inputs).toBe(1);
  });

  it("starts unbiased random Legendary rolls at the ninth queued email", () => {
    const initial = createInitialState(1_000, "", false);
    const padding = initial.contacts.slice(0, 3).map((contact, index) => ({
      ...contact,
      id: `padding-${index}`,
      status: "available" as const,
    }));
    const event = {
      id: "tenth-contact-event",
      definitionId: "public-demo" as const,
      title: "Dimostrazione pubblica",
      location: "Genova",
      startedAt: 1_000,
      resolvesAt: 2_000,
      cost: 0,
      peopleMet: 1,
      demonstrationsGiven: 1,
      contactReward: 1,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      status: "running" as const,
    };
    const state = gameReducer({
      ...initial,
      randomSeed: 1_216,
      contacts: [...initial.contacts, ...padding],
      acquisitionEvents: [event],
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
    }, { type: "TICK", now: 2_000 });

    expect(state.contacts.slice(0, 8).every((contact) => contact.rarity !== "legendary")).toBe(true);
    expect(state.contacts[8].rarity).toBe("legendary");
    expect(SPECIAL_COLLABORATORS.map((profile) => profile.id))
      .toContain(state.contacts[8].specialProfileId);
  });

  it("stores the user name and applies it to the active email signature", () => {
    const state = createInitialState(1_000);

    const updated = gameReducer(state, {
      type: "UPDATE_PROFILE_NAME",
      displayName: "  Andrea   Ungaro  ",
    });

    expect(updated.profile.displayName).toBe("Andrea Ungaro");
    expect(updated.emails[0].body).toContain("Andrea Ungaro - Ordine delle Onde");
    expect(updated.emails[0].body.toLocaleLowerCase("it-IT")).not.toContain("segreteria");
  });

  it("determines and stores the first email outcome exactly once", () => {
    const state = createInitialState(1_000);
    const email = selectActiveEmail(state)!;
    const nearlyComplete = {
      ...state,
      emails: state.emails.map((candidate) => ({
        ...candidate,
        revealedCharacters: candidate.body.length - 1,
      })),
    };
    const sending = gameReducer(nearlyComplete, { type: "WRITE", now: 2_000 });
    const sent = gameReducer(sending, {
      type: "TICK",
      now: 2_000 + GAME_CONFIG.sendDelayMs,
    });
    const tickedAgain = gameReducer(sent, {
      type: "TICK",
      now: 2_000 + GAME_CONFIG.sendDelayMs,
    });

    expect(sent.emails.find((candidate) => candidate.id === email.id)?.status).toBe("sent");
    expect(sent.pendingEmailOutcomes).toHaveLength(1);
    expect(sent.pendingEmailOutcomes[0].result).toBe("trialBooked");
    expect(sent.statistics.emailsSent).toBe(1);
    expect(tickedAgain.pendingEmailOutcomes).toHaveLength(1);
    expect(tickedAgain.statistics.emailsSent).toBe(1);
  });

  it("does not favor Andrea's booking over the other Legendary profiles", () => {
    const initial = createInitialState(1_000);
    const email = selectActiveEmail(initial)!;
    const state = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, historicMembers: 1 },
      statistics: { ...initial.statistics, emailsSent: 1 },
      contacts: initial.contacts.map((contact) =>
        contact.id === email.contactId
          ? {
              ...contact,
              firstName: "Andrea",
              lastName: "Simonazzi",
              rarity: "legendary" as const,
              specialProfileId: "andrea-simonazzi" as const,
            }
          : contact,
      ),
      emails: initial.emails.map((candidate) => ({
        ...candidate,
        revealedCharacters: candidate.body.length - 1,
      })),
    };

    const sending = gameReducer(state, { type: "WRITE", now: 2_000 });
    const sent = gameReducer(sending, {
      type: "TICK",
      now: 2_000 + GAME_CONFIG.sendDelayMs,
    });

    expect(getEmailBookingChance(state)).toBe(0.2);
    expect(sent.pendingEmailOutcomes[0].result).toBe("lost");
  });

  it("does not notify when contacts are running low or exhausted", () => {
    const initial = createInitialState(1_000);
    const activeEmail = selectActiveEmail(initial)!;
    const ready = {
      ...initial,
      contacts: initial.contacts.map((contact) =>
        contact.id === activeEmail.contactId
          ? contact
          : { ...contact, status: "lost" as const },
      ),
      emails: [{ ...activeEmail, revealedCharacters: activeEmail.body.length - 1 }],
    };

    const sending = gameReducer(ready, { type: "WRITE", now: 2_000 });
    const sent = gameReducer(sending, {
      type: "TICK",
      now: 2_000 + GAME_CONFIG.sendDelayMs,
    });

    expect(sent.messages.some((message) => message.subject === "Stiamo finendo i contatti"))
      .toBe(false);
    expect(sent.messages.some((message) => message.subject === "Contatti terminati")).toBe(false);
  });

  it("completes the protected tutorial funnel and unlocks the first upgrade", () => {
    let state = createInitialState(1_000);
    const email = selectActiveEmail(state)!;
    state = {
      ...state,
      emails: [{ ...email, revealedCharacters: email.body.length - 1 }],
    };
    state = gameReducer(state, { type: "WRITE", now: 2_000 });
    state = gameReducer(state, { type: "TICK", now: 3_000 });
    const outcome = state.pendingEmailOutcomes[0];
    state = gameReducer(state, { type: "TICK", now: outcome.resolvesAt });
    const trial = state.scheduledTrials[0];
    state = gameReducer(state, { type: "TICK", now: trial.resolvesAt });

    expect(state.school.activeMembers).toBe(1);
    expect(state.school.peakActiveMembers).toBe(1);
    expect(state.school.euros).toBe(GAME_CONFIG.enrollmentBonus + 15);
    expect(state.unlocks.upgrades).toBe(true);
    expect(state.statistics.trialsBooked).toBe(1);
    expect(state.statistics.membersEnrolled).toBe(1);
    expect(state.collaborators).toHaveLength(0);
    expect(state.unlocks.forms).toBe(true);
    expect(state.unlocks.collaborators).toBe(false);
    expect(state.messages.some((message) => message.subject === "Nuovo collaboratore disponibile")).toBe(false);
  });

  it("makes enrollment equally difficult and progressive for every Legendary", () => {
    const initial = createInitialState(1_000);
    const eva = {
      ...initial.contacts[1],
      firstName: "Eva",
      lastName: "Parodi",
      rarity: "legendary" as const,
      specialProfileId: "eva-parodi" as const,
    };
    const trial = {
      id: "trial-eva",
      contactId: eva.id,
      startsAt: 1_500,
      resolvesAt: 2_000,
      resultSeed: 0,
      status: "scheduled" as const,
    };
    const firstAttempt = gameReducer({
      ...initial,
      school: { ...initial.school, historicMembers: 1 },
      contacts: initial.contacts.map((contact) =>
        contact.id === eva.id ? { ...eva, status: "trialScheduled" as const } : contact,
      ),
      scheduledTrials: [trial],
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
    }, { type: "TICK", now: 2_000 });
    const protectedAttempt = gameReducer({
      ...initial,
      school: { ...initial.school, historicMembers: 1 },
      contacts: initial.contacts.map((contact) =>
        contact.id === eva.id ? { ...eva, status: "trialScheduled" as const } : contact,
      ),
      scheduledTrials: [trial],
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        enrollmentAttempts: { "eva-parodi": 5 },
      },
    }, { type: "TICK", now: 2_000 });

    expect(getLegendaryEnrollmentChance(initial, "andrea-simonazzi")).toBe(0.025);
    expect(getLegendaryEnrollmentChance(initial, "eva-parodi")).toBe(0.025);
    expect(firstAttempt.contacts.find((contact) => contact.id === eva.id)?.status).toBe("lost");
    expect(firstAttempt.legendaryCollaborators.enrollmentAttempts["eva-parodi"]).toBe(1);
    expect(firstAttempt.collaborators).toHaveLength(0);
    expect(protectedAttempt.contacts.find((contact) => contact.id === eva.id)?.status).toBe("enrolled");
    expect(protectedAttempt.collaborators).toHaveLength(1);
    expect(protectedAttempt.collaborators[0].rarity).toBe("legendary");
    expect(protectedAttempt.unlocks.forms).toBe(true);
  });

  it("applies the same enrollment progression to Andrea and every other Legendary", () => {
    const initial = createInitialState(1_000);
    const withEqualAttempts = {
      ...initial,
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        enrollmentAttempts: {
          "andrea-simonazzi": 2,
          "eva-parodi": 2,
        },
      },
    };

    expect(getLegendaryEnrollmentChance(withEqualAttempts, "andrea-simonazzi"))
      .toBe(getLegendaryEnrollmentChance(withEqualAttempts, "eva-parodi"));
  });

  it("schedules booked trials without adding an inbox message", () => {
    let state = createInitialState(1_000);
    const email = selectActiveEmail(state)!;
    state = {
      ...state,
      emails: [{ ...email, revealedCharacters: email.body.length - 1 }],
    };
    state = gameReducer(state, { type: "WRITE", now: 2_000 });
    state = gameReducer(state, { type: "TICK", now: 3_000 });
    const outcome = state.pendingEmailOutcomes[0];
    const messagesBeforeBooking = state.messages;

    state = gameReducer(state, { type: "TICK", now: outcome.resolvesAt });

    expect(state.scheduledTrials).toHaveLength(1);
    expect(state.statistics.trialsBooked).toBe(1);
    expect(state.messages).toBe(messagesBeforeBooking);
    expect(state.messages.some((message) => message.subject === "Nuova lezione di prova prenotata"))
      .toBe(false);
  });

  it("collects periodic fees without duplicating a period", () => {
    const initial = createInitialState(1_000);
    const dueAt = 10_000;
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, nextFeeAt: dueAt },
    };
    const paid = gameReducer(state, { type: "TICK", now: dueAt });
    const sameTick = gameReducer(paid, { type: "TICK", now: dueAt });

    expect(paid.school.euros).toBe(2 * GAME_CONFIG.monthlyMemberFee);
    expect(paid.school.currentMonth).toBe(2);
    expect(sameTick.school.euros).toBe(paid.school.euros);
  });

  it("advances game months even without active members", () => {
    const initial = createInitialState(1_000);
    const advanced = gameReducer(initial, {
      type: "TICK",
      now: 1_000 + GAME_CONFIG.gameMonthMs * 3,
    });

    expect(advanced.school.currentMonth).toBe(4);
    expect(advanced.school.euros).toBe(0);
  });

  it("lets ignored ordinary members leave when a new school year starts in September", () => {
    const initial = createInitialState(1_000);
    const [ignored, trained, legendary, collaboratorMember, recent] = initial.contacts;
    const contacts = [
      { ...ignored, status: "enrolled" as const, rarity: "common" as const, enrolledMonth: 1 },
      { ...trained, status: "enrolled" as const, rarity: "common" as const, enrolledMonth: 1, lastFormTrainingYear: 1 },
      {
        ...legendary,
        firstName: "Andrea",
        lastName: "Simonazzi",
        status: "enrolled" as const,
        rarity: "legendary" as const,
        specialProfileId: "andrea-simonazzi" as const,
        enrolledMonth: 1,
      },
      { ...collaboratorMember, status: "enrolled" as const, rarity: "rare" as const, enrolledMonth: 1 },
      { ...recent, status: "enrolled" as const, rarity: "common" as const, enrolledMonth: 2 },
    ];
    const state = {
      ...initial,
      randomSeed: 7,
      contacts,
      school: { ...initial.school, activeMembers: 5, currentMonth: 8, nextFeeAt: 2_000 },
      collaborators: [{
        id: "collaborator-protected",
        contactId: collaboratorMember.id,
        displayName: `${collaboratorMember.firstName} ${collaboratorMember.lastName}`,
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        assignment: null,
        rarity: "rare" as const,
      }],
    };

    const renewed = gameReducer(state, { type: "TICK", now: 2_000 });

    expect(renewed.contacts.find((contact) => contact.id === ignored.id)?.status).toBe("departed");
    expect(renewed.contacts.filter((contact) => contact.status === "enrolled")).toHaveLength(3);
    expect(renewed.school.activeMembers).toBe(3);
    expect(renewed.statistics.membersDeparted).toBe(2);
    expect(renewed.messages.some((message) => message.subject === "2 iscritti hanno lasciato la scuola")).toBe(true);
  });

  it("reduces annual departure risk and applies the Form 7 rarity curve", () => {
    expect(getMemberAnnualDepartureChance([])).toBe(0.8);
    expect(getMemberAnnualDepartureChance(["form-1", "course-x"])).toBe(0.65);
    expect(getMemberAnnualDepartureChance(["form-1", "course-x", "form-2", "course-y"])).toBe(0.5);
    expect(getMemberAnnualDepartureChance([], "legendary")).toBeCloseTo(0.08);

    const formSeven = ["form-1", "course-x", "form-2", "course-y", "form-3-staff", "form-4-staff", "form-5-staff", "form-6", "form-7"] as const;
    expect(getMemberAnnualDepartureChance([...formSeven], "common", 0)).toBe(0.025);
    expect(getMemberAnnualDepartureChance([...formSeven], "rare", 0)).toBe(0.005);
    expect(getMemberAnnualDepartureChance([...formSeven], "legendary", 0)).toBe(0);
    expect(getMemberAnnualDepartureChance([...formSeven], "common", 1)).toBeCloseTo(0.03);
    expect(getMemberAnnualDepartureChance([...formSeven], "rare", 1)).toBeCloseTo(0.01);
    expect(getMemberAnnualDepartureChance([...formSeven], "legendary", 1)).toBeCloseTo(0.005);
    expect(getMemberAnnualDepartureChance([...formSeven], "common", 3)).toBeCloseTo(0.04);
    expect(getMemberAnnualDepartureChance([...formSeven], "rare", 3)).toBeCloseTo(0.02);
    expect(getMemberAnnualDepartureChance([...formSeven], "legendary", 3)).toBeCloseTo(0.015);
  });

  it("lets Andrea leave under the same rules and retains his full progress", () => {
    const initial = createInitialState(1_000);
    const [andreaContact, evaContact] = initial.contacts;
    const contacts = initial.contacts.map((contact) => {
      if (contact.id === andreaContact.id) {
        return {
          ...contact,
          firstName: "Andrea",
          lastName: "Simonazzi",
          status: "enrolled" as const,
          rarity: "legendary" as const,
          specialProfileId: "andrea-simonazzi" as const,
          enrolledMonth: 1,
        };
      }
      if (contact.id === evaContact.id) {
        return {
          ...contact,
          firstName: "Eva",
          lastName: "Parodi",
          status: "enrolled" as const,
          rarity: "legendary" as const,
          specialProfileId: "eva-parodi" as const,
          enrolledMonth: 1,
        };
      }
      return { ...contact, status: "lost" as const };
    });
    const collaborators = [
      {
        id: "collaborator-andrea",
        contactId: andreaContact.id,
        displayName: "Andrea Simonazzi",
        joinedAt: 1_000,
        forms: ["form-1" as const],
        instructorForms: ["form-1" as const],
        assignment: "writing" as const,
        rarity: "legendary" as const,
        specialProfileId: "andrea-simonazzi" as const,
        lastFormTrainingYear: 0,
      },
      {
        id: "collaborator-eva",
        contactId: evaContact.id,
        displayName: "Eva Parodi",
        joinedAt: 500,
        forms: ["form-1" as const, "course-x" as const, "form-2" as const],
        instructorForms: ["form-1" as const, "form-2" as const],
        assignment: "lessons" as const,
        rarity: "legendary" as const,
        specialProfileId: "eva-parodi" as const,
        lastFormTrainingYear: 0,
      },
    ];
    const renewed = gameReducer({
      ...initial,
      randomSeed: 7,
      contacts,
      collaborators,
      school: {
        ...initial.school,
        activeMembers: 2,
        peakActiveMembers: 2,
        historicMembers: 2,
        currentMonth: 8,
        nextFeeAt: 2_000,
      },
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        encounteredProfileIds: ["andrea-simonazzi", "eva-parodi"],
        enrolledProfileIds: ["andrea-simonazzi", "eva-parodi"],
      },
    }, { type: "TICK", now: 2_000 });

    expect(renewed.contacts.find((contact) => contact.id === andreaContact.id)).toMatchObject({
      status: "departed",
      forms: ["form-1"],
    });
    expect(renewed.collaborators.some((collaborator) =>
      collaborator.specialProfileId === "andrea-simonazzi"
    )).toBe(false);
    expect(renewed.contacts.find((contact) => contact.id === evaContact.id)?.status)
      .toBe("enrolled");
    expect(renewed.collaborators.some((collaborator) =>
      collaborator.specialProfileId === "eva-parodi"
    )).toBe(true);
    expect(renewed.legendaryCollaborators.enrolledProfileIds)
      .toEqual(["eva-parodi"]);
    expect(renewed.legendaryCollaborators.retainedProgress["andrea-simonazzi"]).toEqual({
      forms: ["form-1"],
      instructorForms: ["form-1"],
      formBranchPreferences: [],
      joinedAt: 1_000,
      lastFormTrainingYear: 0,
    });
  });

  it("marks an inbox message as read exactly once", () => {
    const state = createInitialState(1_000);
    const messageId = state.messages[0].id;
    const read = gameReducer(state, { type: "MARK_MESSAGE_READ", messageId });
    const readAgain = gameReducer(read, { type: "MARK_MESSAGE_READ", messageId });

    expect(selectUnreadMessages(state)).toBe(1);
    expect(selectUnreadMessages(read)).toBe(0);
    expect(readAgain).toBe(read);
  });

  it("calculates income per game month from active members", () => {
    const state = createInitialState(1_000);
    const withMembers = { ...state, school: { ...state.school, activeMembers: 3 } };

    expect(selectIncomePerMonth(withMembers)).toBe(3 * GAME_CONFIG.monthlyMemberFee);
  });

  it("resolves free park sparring into new usable contacts once", () => {
    const state = createInitialState(1_000);
    const started = gameReducer(state, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: 2_000,
    });
    const event = started.acquisitionEvents[0];
    const completed = gameReducer(started, { type: "TICK", now: event.resolvesAt });
    const tickedAgain = gameReducer(completed, { type: "TICK", now: event.resolvesAt });

    expect(started.school.euros).toBe(0);
    expect(event.status).toBe("running");
    expect(completed.contacts).toHaveLength(state.contacts.length + event.contactReward);
    expect(completed.contacts.slice(-2).every((contact) =>
      PROSPECT_EMAIL_PROVIDERS.includes(
        contact.email.split("@")[1] as (typeof PROSPECT_EMAIL_PROVIDERS)[number],
      )
    )).toBe(true);
    expect(completed.statistics.contactsAcquired).toBe(event.contactReward);
    expect(completed.statistics.peopleMet).toBe(event.peopleMet);
    expect(completed.statistics.demonstrationsGiven).toBe(event.demonstrationsGiven);
    expect(completed.statistics.eventsCompleted).toBe(1);
    expect(started.equipment.availableSwords).toBe(4);
    expect(completed.equipment.availableSwords).toBe(6);
    expect(completed.equipment.wear).toBe(5);
    expect(tickedAgain.contacts).toHaveLength(completed.contacts.length);
  });

  it("completes a zero-contact event without sending an inbox message", () => {
    const state = createInitialState(1_000);
    const started = gameReducer(state, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: 2_000,
    });
    const withoutAvailableContacts = {
      ...started,
      contacts: started.contacts.map((contact) => ({ ...contact, status: "lost" as const })),
      emails: started.emails.map((email) => ({ ...email, status: "lost" as const })),
      acquisitionEvents: started.acquisitionEvents.map((event) => ({
        ...event,
        contactReward: 0,
      })),
    };
    const messagesBeforeCompletion = withoutAvailableContacts.messages;
    const event = withoutAvailableContacts.acquisitionEvents[0];

    const completed = gameReducer(withoutAvailableContacts, {
      type: "TICK",
      now: event.resolvesAt,
    });

    expect(completed.acquisitionEvents[0].contactReward).toBe(0);
    expect(completed.acquisitionEvents[0].status).toBe("completed");
    expect(completed.statistics.eventsCompleted).toBe(1);
    expect(completed.contacts).toHaveLength(state.contacts.length);
    expect(completed.messages).toHaveLength(messagesBeforeCompletion.length + 1);
    expect(completed.messages[0].subject).toBe("Attività operative disponibili");
  });

  it("requires enough school fame and euros for outdoor lessons", () => {
    const state = createInitialState(1_000);
    const notFamousEnough = {
      ...state,
      school: { ...state.school, euros: 1_000, activeMembers: 4, peakActiveMembers: 4 },
    };
    const blocked = gameReducer(notFamousEnough, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "public-demo",
      now: 2_000,
    });
    const funded = {
      ...state,
      school: { ...state.school, euros: 120, activeMembers: 5, peakActiveMembers: 5 },
    };
    const started = gameReducer(funded, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "public-demo",
      now: 2_000,
    });

    expect(blocked).toBe(notFamousEnough);
    expect(started.school.euros).toBe(0);
    expect(started.acquisitionEvents).toHaveLength(1);
  });

  it("uses the all-time member peak for fame after the school shrinks", () => {
    const initial = createInitialState(1_000);
    const famousSchool = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 70,
        peakActiveMembers: 100,
        euros: 2_000,
      },
      equipment: { ...initial.equipment, totalSwords: 16, availableSwords: 16 },
    };

    const started = gameReducer(famousSchool, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "burtomics",
      now: 2_000,
    });

    expect(started.acquisitionEvents).toHaveLength(1);
    expect(started.school.peakActiveMembers).toBe(100);
  });

  it("repairs worn equipment by spending euros outside events", () => {
    const initial = createInitialState(1_000);
    const worn = {
      ...initial,
      school: { ...initial.school, euros: 100 },
      equipment: { ...initial.equipment, wear: 40 },
    };

    const maintained = gameReducer(worn, { type: "MAINTAIN_EQUIPMENT", now: 2_000 });
    const repeated = gameReducer(maintained, { type: "MAINTAIN_EQUIPMENT", now: 3_000 });

    expect(maintained.school.euros).toBe(5);
    expect(maintained.equipment.wear).toBe(0);
    expect(maintained.statistics.maintenanceCompleted).toBe(1);
    expect(repeated).toBe(maintained);
  });

  it("blocks damaged swords until paid maintenance repairs them", () => {
    const initial = createInitialState(1_000);
    const due = {
      ...initial,
      randomSeed: 4,
      school: { ...initial.school, activeMembers: 3, euros: 20 },
      narrative: { ...initial.narrative, nextEventAt: 2_000 },
    };

    const damaged = gameReducer(due, { type: "TICK", now: 2_000 });
    const repairMessage = damaged.messages.find(
      (message) => message.subject === "Riparazione non programmata",
    );

    expect(repairMessage?.preview).toContain("ha subito un danno");
    expect(damaged.school.euros).toBe(20);
    expect(damaged.equipment).toMatchObject({
      availableSwords: 5,
      damagedSwords: 1,
      wear: 15,
    });

    const eventReady = {
      ...damaged,
      school: { ...damaged.school, activeMembers: 10, peakActiveMembers: 10, euros: 240 },
    };
    const blocked = gameReducer(eventReady, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "sports-stand",
      now: 3_000,
    });

    expect(blocked).toBe(eventReady);

    const maintained = gameReducer(
      { ...damaged, school: { ...damaged.school, euros: 50 } },
      { type: "MAINTAIN_EQUIPMENT", now: 4_000 },
    );

    expect(maintained.school.euros).toBe(5);
    expect(maintained.equipment).toMatchObject({
      availableSwords: 6,
      damagedSwords: 0,
      wear: 0,
    });
  });

  it("does not start an event when full wear has broken every sword", () => {
    const initial = createInitialState(1_000);
    const wornOut = {
      ...initial,
      school: { ...initial.school, activeMembers: 10, peakActiveMembers: 10, euros: 240 },
      equipment: { ...initial.equipment, wear: 100, damagedSwords: 0 },
    };

    const blocked = gameReducer(wornOut, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "sports-stand",
      now: 2_000,
    });

    expect(blocked).toBe(wornOut);
  });

  it("buys official swords and preserves them when equipment upgrades are purchased", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 2_000, historicMembers: 20 },
    };

    const purchased = gameReducer(funded, { type: "BUY_OFFICIAL_SWORD", now: 2_000 });
    const upgraded = gameReducer(purchased, {
      type: "BUY_UPGRADE",
      upgradeId: "organized-rack",
      now: 3_000,
    });

    expect(purchased.school.euros).toBe(1_670);
    expect(purchased.equipment).toMatchObject({ totalSwords: 7, availableSwords: 7 });
    expect(upgraded.equipment).toMatchObject({ totalSwords: 9, availableSwords: 9 });
  });

  it("does not buy an official sword without enough euros", () => {
    const initial = createInitialState(1_000);
    expect(gameReducer(initial, { type: "BUY_OFFICIAL_SWORD", now: 2_000 })).toBe(initial);
  });

  it("can discover a Legendary with the configured roll in a later school", () => {
    const initial = createInitialState(1_000, "", false);
    const padding = initial.contacts.slice(0, 4).map((contact, index) => ({
      ...contact,
      id: `later-school-padding-${index}`,
      status: "available" as const,
    }));
    const archivedSchool = {
      id: "school-archive",
      name: "Sede precedente",
      city: "Genova",
      motto: "",
      specialization: "generale" as const,
      membersAtTransfer: 100,
      emailsSent: 30,
      eventsCompleted: 12,
      transferredAt: 500,
    };
    const event = {
      id: "rare-special-event",
      definitionId: "public-demo" as const,
      title: "Dimostrazione pubblica",
      location: "Genova",
      startedAt: 1_000,
      resolvesAt: 2_000,
      cost: 0,
      peopleMet: 1,
      demonstrationsGiven: 1,
      contactReward: 1,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      status: "running" as const,
    };
    const resolved = gameReducer({
      ...initial,
      randomSeed: 1_216,
      contacts: [...initial.contacts, ...padding],
      network: { ...initial.network, schools: [archivedSchool] },
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        enrolledProfileIds: SPECIAL_COLLABORATORS
          .filter((profile) => profile.id !== "andrea-simonazzi")
          .map((profile) => profile.id),
      },
      acquisitionEvents: [event],
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
    }, { type: "TICK", now: 2_000 });

    expect(getLegendaryAppearanceChance(0)).toBe(0.05);
    expect(getLegendaryAppearanceChance(1)).toBe(0.025);
    expect(getLegendaryAppearanceChance(4)).toBe(0.025);
    expect(resolved.contacts.at(-1)?.specialProfileId).toBe("andrea-simonazzi");
    expect(resolved.legendaryCollaborators.encounteredProfileIds).toContain(
      resolved.contacts.at(-1)?.specialProfileId,
    );
  });

  it("can reencounter the same Legendary before enrollment but never after it", () => {
    const initial = createInitialState(1_000, "", false);
    const evaProfile = SPECIAL_COLLABORATORS.find((profile) => profile.id === "eva-parodi")!;
    const previousEncounter = {
      ...initial.contacts[0],
      id: "eva-previous-encounter",
      firstName: evaProfile.firstName,
      lastName: evaProfile.lastName,
      email: "eva.parodi.leggendaria@cmail.com",
      status: "lost" as const,
      specialProfileId: evaProfile.id,
    };
    const padding = initial.contacts.slice(0, 3).map((contact, index) => ({
      ...contact,
      id: `reencounter-padding-${index}`,
      status: "available" as const,
    }));
    const event = {
      id: "legendary-reencounter",
      definitionId: "public-demo" as const,
      title: "Dimostrazione pubblica",
      location: "Genova",
      startedAt: 1_000,
      resolvesAt: 2_000,
      cost: 0,
      peopleMet: 1,
      demonstrationsGiven: 1,
      contactReward: 1,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      status: "running" as const,
    };
    const baseState = {
      ...initial,
      randomSeed: 1_216,
      contacts: [...initial.contacts, previousEncounter, ...padding],
      acquisitionEvents: [event],
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
      legendaryCollaborators: {
        encounteredProfileIds: [evaProfile.id],
        enrolledProfileIds: SPECIAL_COLLABORATORS
          .filter((profile) => profile.id !== evaProfile.id)
          .map((profile) => profile.id),
        enrollmentAttempts: { [evaProfile.id]: 1 },
        retainedProgress: {},
      },
    };
    const reencountered = gameReducer(baseState, { type: "TICK", now: 2_000 });
    const afterEnrollment = gameReducer({
      ...baseState,
      legendaryCollaborators: {
        ...baseState.legendaryCollaborators,
        enrolledProfileIds: SPECIAL_COLLABORATORS.map((profile) => profile.id),
      },
    }, { type: "TICK", now: 2_000 });

    expect(reencountered.contacts.at(-1)?.specialProfileId).toBe("eva-parodi");
    expect(reencountered.contacts.filter((contact) =>
      contact.specialProfileId === "eva-parodi",
    )).toHaveLength(2);
    expect(afterEnrollment.contacts.at(-1)?.specialProfileId).toBeUndefined();
  });

  it("restores a returning Legendary's Forms and Instructor certificates", () => {
    const initial = createInitialState(1_000, "", false);
    const padding = initial.contacts.slice(0, 4).map((contact, index) => ({
      ...contact,
      id: `return-padding-${index}`,
      status: "lost" as const,
    }));
    const event = {
      id: "legendary-return",
      definitionId: "public-demo" as const,
      title: "Dimostrazione pubblica",
      location: "Genova",
      startedAt: 1_000,
      resolvesAt: 2_000,
      cost: 0,
      peopleMet: 1,
      demonstrationsGiven: 1,
      contactReward: 1,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      status: "running" as const,
    };
    const returning = gameReducer({
      ...initial,
      randomSeed: 1_216,
      contacts: [...initial.contacts, ...padding],
      acquisitionEvents: [event],
      automation: { ...initial.automation, lastProcessedAt: 2_000 },
      legendaryCollaborators: {
        encounteredProfileIds: ["eva-parodi"],
        enrolledProfileIds: SPECIAL_COLLABORATORS
          .filter((profile) => profile.id !== "eva-parodi")
          .map((profile) => profile.id),
        enrollmentAttempts: { "eva-parodi": 10 },
        retainedProgress: {
          "eva-parodi": {
            forms: ["form-1", "course-x", "form-2"],
            instructorForms: ["form-1", "form-2"],
            joinedAt: 500,
            lastFormTrainingYear: 1,
          },
        },
      },
    }, { type: "TICK", now: 2_000 });
    const returnedContact = returning.contacts.at(-1)!;
    const trial = {
      id: "trial-returning-eva",
      contactId: returnedContact.id,
      startsAt: 2_500,
      resolvesAt: 3_000,
      resultSeed: 1,
      status: "scheduled" as const,
    };
    const reenrolled = gameReducer({
      ...returning,
      school: { ...returning.school, historicMembers: 1 },
      contacts: returning.contacts.map((contact) =>
        contact.id === returnedContact.id
          ? { ...contact, status: "trialScheduled" as const }
          : contact,
      ),
      scheduledTrials: [trial],
      automation: { ...returning.automation, lastProcessedAt: 3_000 },
    }, { type: "TICK", now: 3_000 });

    expect(returnedContact).toMatchObject({
      specialProfileId: "eva-parodi",
      forms: ["form-1", "course-x", "form-2"],
      lastFormTrainingYear: 1,
    });
    expect(reenrolled.collaborators.at(-1)).toMatchObject({
      specialProfileId: "eva-parodi",
      forms: ["form-1", "course-x", "form-2"],
      instructorForms: ["form-1", "form-2"],
      joinedAt: 500,
      assignment: null,
    });
    expect(reenrolled.legendaryCollaborators.enrolledProfileIds).toContain("eva-parodi");
  });

  it("derives sent-mail status from the contact funnel", () => {
    const state = createInitialState(1_000);
    const email = { ...state.emails[0], status: "sent" as const };
    const invited = {
      ...state,
      contacts: state.contacts.map((contact) =>
        contact.id === email.contactId ? { ...contact, status: "invited" as const } : contact,
      ),
    };
    const trial = {
      ...invited,
      contacts: invited.contacts.map((contact) =>
        contact.id === email.contactId
          ? { ...contact, status: "trialScheduled" as const }
          : contact,
      ),
    };
    const enrolled = {
      ...trial,
      contacts: trial.contacts.map((contact) =>
        contact.id === email.contactId ? { ...contact, status: "enrolled" as const } : contact,
      ),
    };

    expect(selectSentEmailStatus(invited, email)).toBe("In attesa");
    expect(selectSentEmailStatus(trial, email)).toBe("Prova in palestra");
    expect(selectSentEmailStatus(enrolled, email)).toBe("Iscritto");
  });

  it("buys data-driven upgrades with growing costs", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 200, historicMembers: 1 },
      unlocks: { ...initial.unlocks, upgrades: true },
    };
    const first = gameReducer(funded, {
      type: "BUY_UPGRADE",
      upgradeId: "prepared-presentation",
      now: 2_000,
    });
    const second = gameReducer(first, {
      type: "BUY_UPGRADE",
      upgradeId: "prepared-presentation",
      now: 3_000,
    });

    expect(first.upgrades["prepared-presentation"]).toBe(1);
    expect(first.school.euros).toBe(150);
    expect(second.upgrades["prepared-presentation"]).toBe(2);
    expect(second.school.euros).toBe(85);
  });

  it("adds purchased equipment capacity immediately", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 750, historicMembers: 20 },
    };

    const upgraded = gameReducer(funded, {
      type: "BUY_UPGRADE",
      upgradeId: "organized-rack",
      now: 2_000,
    });

    expect(upgraded.equipment.totalSwords).toBe(8);
    expect(upgraded.equipment.availableSwords).toBe(8);
  });

  it("allows buying an upgrade as soon as the balance covers its price", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 75 },
    };

    const purchased = gameReducer(funded, {
      type: "BUY_UPGRADE",
      upgradeId: "comfortable-keyboard",
      now: 2_000,
    });

    expect(purchased.school.euros).toBe(0);
    expect(purchased.upgrades["comfortable-keyboard"]).toBe(1);
  });

  it("applies speed and charisma upgrades to their production formulas", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 200, historicMembers: 1 },
      unlocks: { ...initial.unlocks, upgrades: true },
    };
    const faster = gameReducer(funded, {
      type: "BUY_UPGRADE",
      upgradeId: "comfortable-keyboard",
      now: 2_000,
    });
    const charismatic = gameReducer(faster, {
      type: "BUY_UPGRADE",
      upgradeId: "prepared-presentation",
      now: 3_000,
    });
    const sparring = getAcquisitionEventDefinition("park-sparring")!;

    expect(faster.player.writingPower).toBe(2);
    expect(getEventFunnelOutcome(charismatic, sparring).emailShareChance).toBeGreaterThan(
      getEventFunnelOutcome(faster, sparring).emailShareChance,
    );
  });

  it("applies writing and welcome upgrades to conversion chances", () => {
    const initial = createInitialState(1_000);
    const improved = {
      ...initial,
      upgrades: {
        ...initial.upgrades,
        "clear-subject": 2,
        "welcome-procedure": 2,
      },
    };

    expect(getEmailBookingChance(improved)).toBeCloseTo(0.232);
    expect(getEnrollmentChance(improved)).toBeCloseTo(0.48);
    expect(getEnrollmentChance(improved, "legendary")).toBeCloseTo(0.03);
  });

  it("assigns one collaborator and writes on the active email automatically", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "collaborator-1",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: null,
      rarity: "rare" as const,
    };
    const withCollaborator = {
      ...initial,
      collaborators: [collaborator],
      unlocks: { ...initial.unlocks, collaborators: true },
    };

    const assigned = gameReducer(withCollaborator, {
      type: "ASSIGN_COLLABORATOR",
      collaboratorId: collaborator.id,
      assignment: "writing",
      now: 1_500,
    });
    const automated = gameReducer(assigned, { type: "TICK", now: 2_000 });

    expect(assigned.collaborators[0].assignment).toBe("writing");
    expect(selectActiveEmail(automated)?.revealedCharacters).toBe(2);
    expect(automated.statistics.inputs).toBe(0);
    expect(automated.statistics.automatedCharacters).toBe(2);
  });

  it("generates passive Social contacts and repairs equipment through assignments", () => {
    const initial = createInitialState(1_000);
    const socialCollaborator = {
      id: "collaborator-social",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "social" as const,
      rarity: "rare" as const,
    };
    const equipmentCollaborator = {
      ...socialCollaborator,
      id: "collaborator-equipment",
      assignment: "equipment" as const,
    };
    const automated = gameReducer(
      {
        ...initial,
        collaborators: [socialCollaborator, equipmentCollaborator],
        unlocks: { ...initial.unlocks, collaborators: true, social: true },
        equipment: { ...initial.equipment, wear: 5 },
        automation: {
          ...initial.automation,
          socialBuffer: 0.99,
          equipmentBuffer: 0.95,
        },
      },
      { type: "TICK", now: 2_000 },
    );

    expect(automated.statistics.socialContacts).toBe(1);
    expect(automated.contacts).toHaveLength(initial.contacts.length + 1);
    expect(automated.contacts.at(-1)?.source).toBe("social");
    expect(automated.equipment.wear).toBe(4);
  });

  it("runs paid Social campaigns after the ten-member unlock", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 30, activeMembers: 10 },
      unlocks: { ...initial.unlocks, social: true },
    };

    const campaigned = gameReducer(funded, { type: "RUN_SOCIAL_CAMPAIGN", now: 2_000 });

    expect(campaigned.school.euros).toBe(5);
    expect(campaigned.statistics.socialCampaigns).toBe(1);
    expect(campaigned.statistics.socialContacts).toBeGreaterThanOrEqual(4);
  });

  it("trains members once per school year, pauses in summer, and restarts in September", () => {
    const initial = createInitialState(1_000);
    const member = { ...initial.contacts[0], status: "enrolled" as const };
    const instructor = {
      id: "instructor-form-1",
      contactId: initial.contacts[1].id,
      displayName: "Istruttore Forma 1",
      joinedAt: 1_000,
      forms: ["form-1" as const, "course-x" as const],
      instructorForms: ["form-1" as const],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 1, euros: 200 },
      contacts: initial.contacts.map((contact) => contact.id === member.id ? member : contact),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const blocked = gameReducer(ready, { type: "START_FORM_TRAINING", personId: member.id, formId: "form-2", now: 2_000 });
    const training = gameReducer(ready, { type: "START_FORM_TRAINING", personId: member.id, formId: "form-1", now: 2_000 });
    const completed = gameReducer(training, { type: "TICK", now: 22_000 });
    const juneState = { ...completed, school: { ...completed.school, currentMonth: 6 } };
    const annualBlock = gameReducer(juneState, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-x", now: 23_000 });
    const julyState = { ...completed, school: { ...completed.school, currentMonth: 7 } };
    const summerBlock = gameReducer(julyState, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-x", now: 23_000 });
    const septemberState = { ...completed, school: { ...completed.school, currentMonth: 9 } };
    const nextSchoolYear = gameReducer(septemberState, { type: "START_FORM_TRAINING", personId: member.id, formId: "course-x", now: 23_000 });

    expect(blocked).toBe(ready);
    expect(training.school.euros).toBe(193.75);
    expect(training.contacts[0].training?.formId).toBe("form-1");
    expect(completed.contacts[0].forms).toContain("form-1");
    expect(completed.contacts[0].training).toBeUndefined();
    expect(completed.statistics.formsCompleted).toBe(1);
    expect(annualBlock).toBe(juneState);
    expect(summerBlock).toBe(julyState);
    expect(nextSchoolYear.contacts[0].training?.formId).toBe("course-x");
    expect(nextSchoolYear.contacts[0].lastFormTrainingYear).toBe(2);
    expect(completed.collaborators).toHaveLength(1);
  });

  it("allows manual member training without an Instructor at the base cost", () => {
    const initial = createInitialState(1_000);
    const member = { ...initial.contacts[0], status: "enrolled" as const };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 1, euros: 25 },
      contacts: initial.contacts.map((contact) => contact.id === member.id ? member : contact),
      unlocks: { ...initial.unlocks, forms: true },
    };

    const training = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: member.id,
      formId: "form-1",
      now: 2_000,
    });

    expect(training.school.euros).toBe(0);
    expect(training.contacts[0].training?.formId).toBe("form-1");
    expect(training.contacts[0].training?.instructorId).toBeUndefined();
    expect(training.contacts[0].training?.completesAt).toBe(22_000);
  });

  it("assigns the Instructor role for free and charges explicit 200% qualifications", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "instructor-conversion",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: ["form-1" as const, "course-x" as const, "form-2" as const],
      instructorForms: [] as Array<"form-1" | "form-2">,
      assignment: null,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, euros: 300 },
      collaborators: [collaborator],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const assigned = gameReducer(ready, {
      type: "ASSIGN_COLLABORATOR",
      collaboratorId: collaborator.id,
      assignment: "instructor",
      now: 2_000,
    });
    const qualifiedFormOne = gameReducer(assigned, {
      type: "START_FORM_TRAINING",
      personId: collaborator.id,
      formId: "form-1",
      now: 2_000,
    });

    expect(assigned.school.euros).toBe(300);
    expect(assigned.collaborators[0].assignment).toBe("instructor");
    expect(assigned.collaborators[0].instructorForms).toEqual([]);
    expect(qualifiedFormOne.school.euros).toBe(250);
    expect(qualifiedFormOne.collaborators[0].instructorForms).toEqual(["form-1"]);
    expect(qualifiedFormOne.collaborators[0].instructorForms).not.toContain("course-x");
    expect(qualifiedFormOne.messages.some((message) => message.subject === "Qualifica da Istruttore ottenuta")).toBe(true);
  });

  it("charges an Instructor 300% total for a new Form and includes its qualification", () => {
    const initial = createInitialState(1_000);
    const instructor = {
      id: "instructor-training",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: ["form-1" as const, "course-x" as const],
      instructorForms: ["form-1" as const],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
      lastFormTrainingYear: 1,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth: 9, euros: 400 },
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const training = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-2",
      now: 2_000,
    });
    const completed = gameReducer(training, { type: "TICK", now: 32_000 });

    expect(training.school.euros).toBe(100);
    expect(training.collaborators[0].training?.includesInstructorCertification).toBe(true);
    expect(completed.collaborators[0].forms).toContain("form-2");
    expect(completed.collaborators[0].instructorForms).toContain("form-2");
  });

  it("uses the Instructor discount when available and falls back to manual training", () => {
    const initial = createInitialState(1_000);
    const [firstContact, secondContact, instructorContact] = initial.contacts;
    const first = { ...firstContact, status: "enrolled" as const };
    const second = { ...secondContact, status: "enrolled" as const };
    const instructor = {
      id: "single-capacity-instructor",
      contactId: instructorContact.id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: ["form-1" as const],
      instructorForms: ["form-1" as const],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, euros: 100 },
      contacts: initial.contacts.map((contact) =>
        contact.id === first.id ? first : contact.id === second.id ? second : contact
      ),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const firstTraining = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: first.id,
      formId: "form-1",
      now: 2_000,
    });
    const secondBlocked = gameReducer(firstTraining, {
      type: "START_FORM_TRAINING",
      personId: second.id,
      formId: "form-1",
      now: 3_000,
    });

    expect(firstTraining.contacts.find((contact) => contact.id === first.id)?.training?.instructorId).toBe(instructor.id);
    expect(secondBlocked.contacts.find((contact) => contact.id === second.id)?.training?.instructorId).toBeUndefined();
    expect(secondBlocked.school.euros).toBe(68.75);
  });

  it("starts automatic teaching, respects pause, and fills six Tiamat slots", () => {
    const initial = createInitialState(1_000);
    const students = Array.from({ length: 6 }, (_, index) => ({
      ...initial.contacts[index % initial.contacts.length],
      id: `tiamat-student-${index}`,
      status: "enrolled" as const,
      forms: [],
      training: undefined,
      lastFormTrainingYear: undefined,
    }));
    const instructor = {
      id: "tiamat-instructor",
      contactId: "external-instructor-contact",
      displayName: "Istruttore Tiamat",
      joinedAt: 1_000,
      forms: ["form-1" as const],
      instructorForms: ["form-1" as const],
      formBranchPreferences: ["Spada Lunga" as const],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 6, euros: 100 },
      contacts: students,
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: { ...initial.upgrades, "tiamat-instructor": 5 },
    };

    const teaching = gameReducer(ready, { type: "TICK", now: 2_000 });
    expect(teaching.contacts.filter((contact) => contact.training).length).toBe(6);
    expect(teaching.school.euros).toBe(62.5);

    const paused = gameReducer({
      ...ready,
      collaborators: [{ ...instructor, autoTeachingEnabled: false }],
    }, { type: "TICK", now: 2_000 });
    expect(paused.contacts.every((contact) => !contact.training)).toBe(true);
    expect(paused.school.euros).toBe(100);
  });

  it("generates one to three weapon preferences when Course Y is completed", () => {
    const initial = createInitialState(1_000);
    const member = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: ["form-1", "course-x", "form-2"] as FormId[],
    };
    const instructor = {
      id: "course-y-instructor",
      contactId: "external-course-y-instructor",
      displayName: "Istruttore Corso Y",
      joinedAt: 1_000,
      forms: ["course-y" as const],
      instructorForms: ["course-y" as const],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, euros: 100 },
      contacts: initial.contacts.map((contact) => contact.id === member.id ? member : contact),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };
    const training = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: member.id,
      formId: "course-y",
      now: 2_000,
    });
    const completed = gameReducer(training, { type: "TICK", now: 37_000 });
    const preferences = completed.contacts.find((contact) => contact.id === member.id)
      ?.formBranchPreferences ?? [];

    expect(preferences.length).toBeGreaterThanOrEqual(1);
    expect(preferences.length).toBeLessThanOrEqual(3);
    expect(new Set(preferences).size).toBe(preferences.length);
  });

  it("uses Polivalenza didattica to unlock additional Instructor weapon branches", () => {
    const initial = createInitialState(1_000);
    const instructor = {
      id: "versatile-instructor",
      contactId: "external-versatile-instructor",
      displayName: "Istruttore Polivalente",
      joinedAt: 1_000,
      forms: ["form-1", "course-x", "form-2", "course-y", "form-3-long"] as FormId[],
      instructorForms: ["form-1", "form-2", "course-y", "form-3-long"] as FormId[],
      formBranchPreferences: ["Spada Lunga" as const],
      autoTeachingEnabled: true,
      assignment: "instructor" as const,
      rarity: "legendary" as const,
      lastFormTrainingYear: 1,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth: 9, euros: 2_000 },
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };
    const blocked = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-3-staff",
      now: 2_000,
    });
    const unlocked = gameReducer({
      ...ready,
      upgrades: { ...ready.upgrades, "instructor-versatility": 1 },
    }, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-3-staff",
      now: 2_000,
    });

    expect(blocked).toBe(ready);
    expect(unlocked.collaborators[0].training?.formId).toBe("form-3-staff");
    expect(unlocked.school.euros).toBe(200);
  });

  it("creates a Rare collaborator at Form 7 and applies weapon and Legendary bonuses", () => {
    const initial = createInitialState(1_000);
    const member = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      rarity: "rare" as const,
      forms: ["form-1", "course-x", "form-2", "course-y", "form-3-long", "form-4-long", "form-5-long", "form-6"] as const,
      lastFormTrainingYear: 8,
    };
    const instructor = {
      id: "instructor-form-7",
      contactId: initial.contacts[1].id,
      displayName: "Istruttore Forma 7",
      joinedAt: 1_000,
      forms: ["form-7" as const],
      instructorForms: ["form-7" as const],
      assignment: "instructor" as const,
      rarity: "legendary" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 1, currentMonth: 97, euros: 1_000 },
      contacts: initial.contacts.map((contact) => contact.id === member.id
        ? { ...member, forms: [...member.forms] }
        : contact),
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
    };
    const training = gameReducer(ready, { type: "START_FORM_TRAINING", personId: member.id, formId: "form-7", now: 2_000 });
    const completed = gameReducer(training, { type: "TICK", now: 77_000 });
    const collaborator = completed.collaborators.find((candidate) => candidate.contactId === member.id)!;

    expect(collaborator.forms.at(-1)).toBe("form-7");
    expect(completed.unlocks.collaborators).toBe(true);
    expect(completed.statistics.collaboratorsRecruited).toBe(1);
    const longFormFive = { ...collaborator, forms: ["form-1", "course-x", "form-2", "course-y", "form-3-long", "form-4-long", "form-5-long"] as const, assignment: "events" as const };
    expect(getCollaboratorProductivity({ ...longFormFive, forms: [...longFormFive.forms] })).toBe(1.5);
    expect(getAvailableForms({ ...longFormFive, forms: [...longFormFive.forms] }, 8).map((form) => form.id)).toEqual(["form-6"]);

    const legendary = { ...longFormFive, rarity: "legendary" as const, forms: [...longFormFive.forms, "form-6"] as const, lastFormTrainingYear: 8 };
    expect(getCollaboratorProductivity({ ...legendary, forms: [...legendary.forms] })).toBe(3.2);
    expect(getAvailableForms({ ...legendary, forms: [...legendary.forms] }, 9).map((form) => form.id)).toEqual(["form-7"]);
  });

  it("grants each achievement and its reward only once", () => {
    const initial = createInitialState(1_000);
    const qualifying = {
      ...initial,
      statistics: { ...initial.statistics, emailsSent: 1 },
    };

    const earned = gameReducer(qualifying, { type: "TICK", now: 2_000 });
    const repeated = gameReducer(earned, { type: "TICK", now: 2_000 });

    expect(earned.achievements).toContain("first-email");
    expect(earned.school.euros).toBe(5);
    expect(earned.messages.some((message) => message.subject === "Traguardo: Prima email inviata")).toBe(true);
    expect(repeated.school.euros).toBe(earned.school.euros);
    expect(repeated.achievements.filter((id) => id === "first-email")).toHaveLength(1);
  });

  it("rotates short goals and grants each narrative reward only once", () => {
    const initial = createInitialState(1_000);
    const qualifying = {
      ...initial,
      achievements: ["first-email" as const],
      statistics: { ...initial.statistics, emailsSent: 3 },
    };

    const completed = gameReducer(qualifying, { type: "TICK", now: 2_000 });
    const repeated = gameReducer(completed, { type: "TICK", now: 2_000 });

    expect(completed.school.euros).toBe(15);
    expect(completed.shortGoal.definitionId).toBe("book-trials");
    expect(completed.shortGoal.completedCount).toBe(1);
    expect(completed.messages[0].subject).toBe("Obiettivo completato: Tre inviti in partenza");
    expect(completed.messages[0].preview).toContain("Agenda in movimento");
    expect(repeated.school.euros).toBe(completed.school.euros);
  });

  it("marks the whole inbox as read in one action", () => {
    const initial = createInitialState(1_000);
    const read = gameReducer(initial, { type: "MARK_ALL_MESSAGES_READ" });

    expect(read.messages.every((message) => !message.unread)).toBe(true);
  });

  it("resolves a due narrative event once and schedules the next one", () => {
    const initial = createInitialState(1_000);
    const due = {
      ...initial,
      school: { ...initial.school, activeMembers: 3 },
      narrative: { ...initial.narrative, nextEventAt: 2_000 },
    };

    const resolved = gameReducer(due, { type: "TICK", now: 2_000 });
    const repeated = gameReducer(resolved, { type: "TICK", now: 2_000 });

    expect(resolved.narrative.history).toHaveLength(1);
    expect(resolved.statistics.narrativeEvents).toBe(1);
    expect(resolved.narrative.nextEventAt).toBeGreaterThan(2_000);
    expect(repeated.narrative.history).toHaveLength(1);
  });

  it("includes the amount in an extraordinary contribution notification", () => {
    const initial = createInitialState(1_000);
    const due = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, activeMembers: 3 },
      narrative: { ...initial.narrative, nextEventAt: 2_000 },
    };

    const resolved = gameReducer(due, { type: "TICK", now: 2_000 });
    const contribution = resolved.messages.find(
      (message) => message.subject === "Contributo straordinario",
    );

    expect(contribution?.preview).toContain("Contributo ricevuto: 20,00\u00a0€.");
    expect(resolved.narrative.history[0].summary).toBe(contribution?.preview);
  });

  it("offers and founds a new school while preserving the permanent network", () => {
    const initial = createInitialState(1_000);
    const collaborators = Array.from({ length: 8 }, (_, index) => ({
      id: `collaborator-${index}`,
      contactId: index === 0 ? initial.contacts[0].id : `common-contact-${index}`,
      displayName: index === 0 ? "Eva Parodi" : `Collaboratore ${index}`,
      joinedAt: index === 0 ? 500 : 1_000,
      forms: index === 0 ? ["form-1" as const] : [],
      instructorForms: index === 0 ? ["form-1" as const] : [],
      assignment: null,
      rarity: index === 0 ? "legendary" as const : "common" as const,
      specialProfileId: index === 0 ? "eva-parodi" as const : undefined,
    }));
    const eligible = {
      ...initial,
      school: { ...initial.school, activeMembers: 80, historicMembers: 100, euros: 500 },
      contacts: initial.contacts.map((contact, index) => index === 0
        ? {
            ...contact,
            firstName: "Eva",
            lastName: "Parodi",
            status: "enrolled" as const,
            rarity: "legendary" as const,
            specialProfileId: "eva-parodi" as const,
            forms: ["form-1" as const],
            enrolledMonth: 1,
          }
        : contact),
      collaborators,
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        encounteredProfileIds: ["eva-parodi" as const],
        enrolledProfileIds: ["eva-parodi" as const],
      },
      statistics: { ...initial.statistics, eventsCompleted: 12, emailsSent: 30 },
      upgrades: { ...initial.upgrades, "comfortable-keyboard": 2 },
    };

    expect(canFoundSchool(eligible)).toBe(true);
    const offered = gameReducer(eligible, { type: "TICK", now: 2_000 });
    const offeredAgain = gameReducer(offered, { type: "TICK", now: 2_000 });
    const founded = gameReducer(offeredAgain, {
      type: "FOUND_SCHOOL",
      now: 3_000,
      details: { name: "Ordine del Faro", city: "Trieste", accentColor: "#7652b3", motto: "Verso il largo", specialization: "redazione" },
    });

    expect(offered.messages.filter((message) => message.subject === "Richiesta apertura nuova scuola")).toHaveLength(1);
    expect(offeredAgain.messages.filter((message) => message.subject === "Richiesta apertura nuova scuola")).toHaveLength(1);
    expect(founded.school.name).toBe("Ordine del Faro");
    expect(founded.school.city).toBe("Trieste");
    expect(founded.school.activeMembers).toBe(0);
    expect(founded.school.historicMembers).toBe(100);
    expect(founded.collaborators).toEqual([]);
    expect(founded.contacts).toHaveLength(5);
    expect(founded.legendaryCollaborators.enrolledProfileIds).toEqual([]);
    expect(founded.legendaryCollaborators.retainedProgress["eva-parodi"]).toMatchObject({
      forms: ["form-1"],
      instructorForms: ["form-1"],
      joinedAt: 500,
    });
    expect(founded.legendaryCollaborators.encounteredProfileIds).toEqual(
      expect.arrayContaining(initial.legendaryCollaborators.encounteredProfileIds),
    );
    expect(founded.upgrades["comfortable-keyboard"]).toBe(0);
    expect(founded.network.reputation).toBe(1);
    expect(founded.network.schools).toHaveLength(1);
    expect(founded.network.schools[0].membersAtTransfer).toBe(80);
    expect(founded.player.writingPower).toBeCloseTo(1.375);
    expect(selectIncomePerMonth(founded)).toBeCloseTo(6.25);
    expect(getPrestigeRequirements(founded)).toEqual({ historicMembers: 200, collaborators: 10, events: 24 });

    const postPrestigeEvent = {
      id: "post-prestige-contacts",
      definitionId: "public-demo" as const,
      title: "Dimostrazione pubblica",
      location: "Trieste",
      startedAt: 3_000,
      resolvesAt: 4_000,
      cost: 0,
      peopleMet: 4,
      demonstrationsGiven: 4,
      contactReward: 4,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      status: "running" as const,
    };
    const postPrestigeContacts = gameReducer({
      ...founded,
      acquisitionEvents: [postPrestigeEvent],
      automation: { ...founded.automation, lastProcessedAt: 4_000 },
    }, { type: "TICK", now: 4_000 });
    expect(postPrestigeContacts.contacts).toHaveLength(9);

    const upgraded = gameReducer(
      { ...founded, school: { ...founded.school, euros: 100 } },
      { type: "BUY_UPGRADE", upgradeId: "comfortable-keyboard", now: 4_000 },
    );
    expect(upgraded.school.euros).toBe(14);
  });

  it("runs events together while both members and swords remain available", () => {
    const initial = createInitialState(1_000);
    const resourced = {
      ...initial,
      school: { ...initial.school, euros: 200, activeMembers: 5, peakActiveMembers: 5 },
    };

    const first = gameReducer(resourced, { type: "START_ACQUISITION_EVENT", definitionId: "public-demo", now: 2_000 });
    const second = gameReducer(first, { type: "START_ACQUISITION_EVENT", definitionId: "organized-flyering", now: 2_100 });
    const blockedByCapacity = gameReducer(second, { type: "START_ACQUISITION_EVENT", definitionId: "organized-flyering", now: 2_200 });

    expect(second.acquisitionEvents.filter((event) => event.status === "running")).toHaveLength(2);
    expect(second.equipment.availableSwords).toBe(0);
    expect(second.acquisitionEvents.map((event) => event.membersUsed)).toEqual([2, 1]);
    expect(blockedByCapacity).toBe(second);
  });

  it("guarantees a booking after four consecutive lost email outcomes", () => {
    const initial = createInitialState(1_000);
    const active = initial.emails[0];
    const previous = Array.from({ length: 4 }, (_, index) => ({
      ...active,
      id: `lost-email-${index}`,
      contactId: initial.contacts[index + 1].id,
      status: "lost" as const,
      revealedCharacters: active.body.length,
      sentAt: 1_100 + index,
    }));
    const ready = {
      ...initial,
      emails: [...previous, { ...active, revealedCharacters: active.body.length - 1 }],
      statistics: { ...initial.statistics, emailsSent: 4 },
    };

    const sending = gameReducer(ready, { type: "WRITE", now: 2_000 });
    const sent = gameReducer(sending, { type: "TICK", now: 2_000 + GAME_CONFIG.sendDelayMs });

    expect(sent.pendingEmailOutcomes.at(-1)?.result).toBe("trialBooked");
  });

  it("guarantees enrollment after four consecutive unsuccessful trials", () => {
    const initial = createInitialState(1_000, "", false);
    const completedTrials = initial.contacts.slice(0, 4).map((contact, index) => ({
      id: `completed-trial-${index}`,
      contactId: contact.id,
      startsAt: 1_000,
      resolvesAt: 1_100 + index,
      resultSeed: index,
      status: "completed" as const,
    }));
    const currentContact = initial.contacts[4];
    const currentTrial = {
      id: "current-trial",
      contactId: currentContact.id,
      startsAt: 1_500,
      resolvesAt: 2_000,
      resultSeed: 123,
      status: "scheduled" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, historicMembers: 1 },
      contacts: initial.contacts.map((contact, index) => ({
        ...contact,
        status: (index < 4 ? "lost" : index === 4 ? "trialScheduled" : contact.status) as typeof contact.status,
      })),
      scheduledTrials: [...completedTrials, currentTrial],
    };

    const resolved = gameReducer(ready, { type: "TICK", now: 2_000 });

    expect(resolved.contacts.find((contact) => contact.id === currentContact.id)?.status).toBe("enrolled");
  });

  it("prevents a third consecutive negative narrative event", () => {
    const initial = createInitialState(1_000);
    const ready = {
      ...initial,
      school: { ...initial.school, activeMembers: 6 },
      narrative: {
        nextEventAt: 2_000,
        history: [
          { id: "negative-1", definitionId: "missed-renewal" as const, title: "Mancato rinnovo", occurredAt: 1_000, summary: "" },
          { id: "negative-2", definitionId: "unexpected-repair" as const, title: "Riparazione", occurredAt: 1_500, summary: "" },
        ],
      },
    };

    const resolved = gameReducer(ready, { type: "TICK", now: 2_000 });
    const selected = NARRATIVE_EVENTS.find((event) => event.id === resolved.narrative.history.at(-1)?.definitionId);

    expect(selected?.kind).not.toBe("negative");
  });

  it("updates only the active draft when a visual email upgrade is bought", () => {
    const initial = createInitialState(1_000, "Andrea Ungaro");
    const sentEmail = {
      ...initial.emails[0],
      status: "sent" as const,
      presentationLevel: 0 as const,
    };
    const activeEmail = {
      ...initial.emails[0],
      id: "email-active",
      status: "writing" as const,
      presentationLevel: 0 as const,
    };
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 10_000, historicMembers: 15 },
      emails: [sentEmail, activeEmail],
    };

    const withLayout = gameReducer(funded, {
      type: "BUY_UPGRADE",
      upgradeId: "outlook-templates",
      now: 2_000,
    });

    expect(withLayout.emails[0].presentationLevel).toBe(0);
    expect(withLayout.emails[1].presentationLevel).toBe(1);
  });
});
