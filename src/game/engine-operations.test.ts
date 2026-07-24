import { describe, expect, it } from "vitest";
import { PROSPECT_EMAIL_PROVIDERS } from "../content/prospectDirectory";
import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import { GAME_CONFIG } from "./config";
import {
  createInitialState,
  gameReducer,
  getLegendaryAppearanceChance,
} from "./engine";
import {
  selectIncomePerMonth,
  selectSentEmailStatus,
  selectUnreadMessages,
} from "./selectors";

describe("game engine: operations", () => {
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

  it("adds €5 for every registered form on the member", () => {
    const state = createInitialState(1_000);
    const forms = [
      "form-1",
      "course-x",
      "form-2",
      "course-y",
      "form-3-long",
      "form-3-double",
      "form-4-long",
    ] as const;
    const member = {
      ...state.contacts[0],
      status: "enrolled" as const,
      forms: [],
    };
    const dueAt = 10_000;
    const withTrainedMember = {
      ...state,
      contacts: [member, ...state.contacts.slice(1)],
      collaborators: [{
        id: "collaborator-trained-member",
        contactId: member.id,
        displayName: `${member.firstName} ${member.lastName}`,
        joinedAt: 2_000,
        forms: [...forms],
        instructorForms: [],
        assignment: null,
        rarity: "legendary" as const,
      }],
      school: { ...state.school, activeMembers: 1, nextFeeAt: dueAt },
    };

    expect(selectIncomePerMonth(withTrainedMember)).toBe(75);
    expect(gameReducer(withTrainedMember, { type: "TICK", now: dueAt }).school.euros).toBe(75);
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
    expect(completed.equipment.wear).toBe(10);
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

  it("cancels a running event with quarter wear, no cooldown, and no contacts", () => {
    const state = createInitialState(1_000);
    const started = gameReducer(state, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: 2_000,
    });
    const event = started.acquisitionEvents[0];

    const cancelled = gameReducer(started, {
      type: "CANCEL_ACQUISITION_EVENT",
      eventId: event.id,
      now: 3_000,
    });

    expect(cancelled.acquisitionEvents).toHaveLength(0);
    expect(cancelled.contacts).toEqual(started.contacts);
    expect(cancelled.statistics.eventsCompleted).toBe(0);
    expect(cancelled.equipment.availableSwords).toBe(6);
    expect(cancelled.equipment.wear).toBe(event.wearAdded * 0.25);
    expect(cancelled.activities.eventCooldowns["park-sparring"]).toBeUndefined();
    expect(cancelled.school.euros).toBe(started.school.euros);
  });

  it("refunds a paid cancelled event while applying only quarter wear", () => {
    const initial = createInitialState(1_000);
    const ready = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 5,
        historicMembers: 5,
        euros: 120,
      },
    };
    const started = gameReducer(ready, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "public-demo",
      now: 2_000,
    });
    const event = started.acquisitionEvents[0];

    const cancelled = gameReducer(started, {
      type: "CANCEL_ACQUISITION_EVENT",
      eventId: event.id,
      now: 3_000,
    });

    expect(cancelled.school.euros).toBe(120);
    expect(cancelled.equipment.availableSwords).toBe(6);
    expect(cancelled.equipment.wear).toBe(event.wearAdded * 0.25);
    expect(cancelled.activities.eventCooldowns["public-demo"]).toBeUndefined();
  });

  it("starts an event cooldown only after completion", () => {
    const state = createInitialState(1_000);
    const started = gameReducer(state, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: 2_000,
    });
    const event = started.acquisitionEvents[0];
    const completed = gameReducer(started, { type: "TICK", now: event.resolvesAt });

    expect(completed.activities.eventCooldowns["park-sparring"]).toEqual({
      kind: "realtime",
      startedAt: event.resolvesAt,
      availableAt: event.resolvesAt + 5_000,
    });
    expect(gameReducer(completed, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: event.resolvesAt + 4_999,
    })).toBe(completed);
    expect(gameReducer(completed, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: event.resolvesAt + 5_000,
    }).acquisitionEvents.filter((candidate) => candidate.status === "running")).toHaveLength(1);
  });

  it("expires a calendar event cooldown when Admin advances the target month", () => {
    const initial = createInitialState(1_000);
    const ready = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 20,
        historicMembers: 20,
        euros: 800,
      },
      equipment: {
        ...initial.equipment,
        totalSwords: 8,
        availableSwords: 8,
      },
    };
    const started = gameReducer(ready, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "sports-stand",
      now: 2_000,
    });
    const completed = gameReducer(started, { type: "TICK", now: 12_000 });

    expect(completed.activities.eventCooldowns["sports-stand"]).toMatchObject({
      kind: "calendar",
      availableAtMonth: ready.school.currentMonth + 1,
    });

    const advanced = gameReducer(completed, { type: "ADMIN_ADVANCE_MONTH", now: 13_000 });
    const restarted = gameReducer(advanced, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "sports-stand",
      now: 13_000,
    });

    expect(advanced.school.currentMonth).toBe(ready.school.currentMonth + 1);
    expect(restarted.acquisitionEvents.filter((event) =>
      event.definitionId === "sports-stand" && event.status === "running"
    )).toHaveLength(1);
  });

  it("requires enough school fame and euros for outdoor lessons", () => {
    const state = createInitialState(1_000);
    const notFamousEnough = {
      ...state,
      school: { ...state.school, euros: 1_000, activeMembers: 4, peakActiveMembers: 4, historicMembers: 4 },
    };
    const blocked = gameReducer(notFamousEnough, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "public-demo",
      now: 2_000,
    });
    const funded = {
      ...state,
      school: { ...state.school, euros: 120, activeMembers: 5, peakActiveMembers: 5, historicMembers: 5 },
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

  it("uses cumulative enrollments for Fame after the school shrinks", () => {
    const initial = createInitialState(1_000);
    const famousSchool = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 70,
        peakActiveMembers: 70,
        historicMembers: 100,
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
    expect(started.school.historicMembers).toBe(100);
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

    expect(maintained.school.euros).toBe(25);
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
      (message) => message.subject === "Un piccolo disastro",
    );

    expect(repairMessage?.preview).toContain("Non so cosa sia successo");
    expect(damaged.school.euros).toBe(20);
    expect(damaged.equipment).toMatchObject({
      availableSwords: 5,
      damagedSwords: 1,
      wear: 30,
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
      { ...damaged, school: { ...damaged.school, euros: 310 } },
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
      upgrades: {
        ...initial.upgrades,
        "pre-event-check": 5,
        "maintenance-kit": 5,
      },
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

    expect(getLegendaryAppearanceChance()).toBe(0.02);
    expect(resolved.contacts.at(-1)?.specialProfileId).toBe("andrea-simonazzi");
    expect(resolved.legendaryCollaborators.encounteredProfileIds).toContain(
      resolved.contacts.at(-1)?.specialProfileId,
    );
  });

  it("reuses a released Legendary contact and falls back only while it is reserved", () => {
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

    expect(reencountered.contacts.find((contact) =>
      contact.specialProfileId === "eva-parodi",
    )).toMatchObject({
      id: previousEncounter.id,
      rarity: "legendary",
      status: "available",
    });
    expect(reencountered.contacts.filter((contact) =>
      contact.specialProfileId === "eva-parodi",
    )).toHaveLength(1);
    expect(afterEnrollment.contacts.at(-1)).toMatchObject({
      rarity: "ultra-rare",
      specialProfileId: undefined,
    });
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
      resultSeed: 0,
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
});
