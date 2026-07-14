import { describe, expect, it } from "vitest";
import { PROSPECT_EMAIL_PROVIDERS } from "../content/emailAddresses";
import { GAME_CONFIG } from "./config";
import { canFoundSchool, createInitialState, gameReducer, getPrestigeRequirements } from "./engine";
import { getEmailBookingChance, getEnrollmentChance } from "./formulas";
import { NARRATIVE_EVENTS } from "../content/narrativeEvents";
import {
  selectActiveEmail,
  selectIncomePerMonth,
  selectSentEmailStatus,
  selectUnreadMessages,
} from "./selectors";

describe("game engine", () => {
  it("creates a playable tutorial state", () => {
    const state = createInitialState(1_000);

    expect(state.contacts).toHaveLength(10);
    expect(state.contacts.filter((contact) => contact.status === "available")).toHaveLength(9);
    expect(state.contacts.map((contact) => contact.email.split("@")[1])).toEqual([
      ...PROSPECT_EMAIL_PROVIDERS,
      ...PROSPECT_EMAIL_PROVIDERS,
      "cmail.com",
      "hotlook.it",
    ]);
    expect(selectActiveEmail(state)?.status).toBe("writing");
    expect(state.school.euros).toBe(0);
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

  it("stores the user name and applies it to the active email signature", () => {
    const state = createInitialState(1_000);

    const updated = gameReducer(state, {
      type: "UPDATE_PROFILE_NAME",
      displayName: "  Andrea   Simonazzi  ",
    });

    expect(updated.profile.displayName).toBe("Andrea Simonazzi");
    expect(updated.emails[0].body).toContain("Andrea Simonazzi - Ordine delle Onde");
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
    expect(state.school.euros).toBe(
      GAME_CONFIG.enrollmentBonus + GAME_CONFIG.monthlyMemberFee + 25,
    );
    expect(state.unlocks.upgrades).toBe(true);
    expect(state.statistics.trialsBooked).toBe(1);
    expect(state.statistics.membersEnrolled).toBe(1);
    expect(state.collaborators).toHaveLength(1);
    expect(state.unlocks.collaborators).toBe(true);
    expect(state.messages.some((message) => message.subject === "Nuovo collaboratore disponibile")).toBe(true);
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
    expect(completed.contacts).toHaveLength(state.contacts.length + 2);
    expect(completed.contacts.slice(-2).map((contact) => contact.email.split("@")[1])).toEqual([
      "cmail.com",
      "hotlook.it",
    ]);
    expect(completed.statistics.contactsAcquired).toBe(2);
    expect(completed.statistics.peopleMet).toBe(event.peopleMet);
    expect(completed.statistics.demonstrationsGiven).toBe(event.demonstrationsGiven);
    expect(completed.statistics.eventsCompleted).toBe(1);
    expect(started.equipment.availableSwords).toBe(4);
    expect(completed.equipment.availableSwords).toBe(6);
    expect(completed.equipment.wear).toBe(3);
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
    expect(completed.messages).toBe(messagesBeforeCompletion);
  });

  it("requires enough euros for the programmed public event", () => {
    const state = createInitialState(1_000);
    const blocked = gameReducer(state, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "public-demo",
      now: 2_000,
    });
    const funded = {
      ...state,
      school: { ...state.school, euros: 20, activeMembers: 1 },
    };
    const started = gameReducer(funded, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "public-demo",
      now: 2_000,
    });

    expect(blocked).toBe(state);
    expect(started.school.euros).toBe(5);
    expect(started.acquisitionEvents).toHaveLength(1);
  });

  it("repairs worn equipment by spending euros outside events", () => {
    const initial = createInitialState(1_000);
    const worn = {
      ...initial,
      school: { ...initial.school, euros: 15 },
      equipment: { ...initial.equipment, wear: 40 },
    };

    const maintained = gameReducer(worn, { type: "MAINTAIN_EQUIPMENT", now: 2_000 });
    const repeated = gameReducer(maintained, { type: "MAINTAIN_EQUIPMENT", now: 3_000 });

    expect(maintained.school.euros).toBe(10);
    expect(maintained.equipment.wear).toBe(0);
    expect(maintained.statistics.maintenanceCompleted).toBe(1);
    expect(repeated).toBe(maintained);
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
    const eventStarted = gameReducer(charismatic, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "park-sparring",
      now: 4_000,
    });

    expect(faster.player.writingPower).toBe(2);
    expect(eventStarted.acquisitionEvents[0].contactReward).toBeGreaterThan(2);
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
    expect(getEnrollmentChance(improved)).toBeCloseTo(0.6);
  });

  it("assigns one collaborator and writes on the active email automatically", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "collaborator-1",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      assignment: null,
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
      assignment: "social" as const,
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

  it("trains collaborators through the ordered Form path", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "collaborator-training",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      assignment: "writing" as const,
    };
    const ready = {
      ...initial,
      school: { ...initial.school, euros: 20 },
      collaborators: [collaborator],
      unlocks: { ...initial.unlocks, collaborators: true, forms: true },
    };

    const blocked = gameReducer(ready, { type: "START_FORM_TRAINING", collaboratorId: collaborator.id, formId: "form-2", now: 2_000 });
    const training = gameReducer(ready, { type: "START_FORM_TRAINING", collaboratorId: collaborator.id, formId: "form-1", now: 2_000 });
    const completed = gameReducer(training, { type: "TICK", now: 22_000 });

    expect(blocked).toBe(ready);
    expect(training.school.euros).toBe(5);
    expect(training.collaborators[0].training?.formId).toBe("form-1");
    expect(completed.collaborators[0].forms).toContain("form-1");
    expect(completed.collaborators[0].training).toBeUndefined();
    expect(completed.statistics.formsCompleted).toBe(1);
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
      contactId: initial.contacts[0].id,
      displayName: `Collaboratore ${index}`,
      joinedAt: 1_000,
      forms: [],
      assignment: null,
    }));
    const eligible = {
      ...initial,
      school: { ...initial.school, activeMembers: 80, historicMembers: 100, euros: 500 },
      collaborators,
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
    expect(founded.upgrades["comfortable-keyboard"]).toBe(0);
    expect(founded.network.reputation).toBe(1);
    expect(founded.network.schools).toHaveLength(1);
    expect(founded.network.schools[0].membersAtTransfer).toBe(80);
    expect(founded.player.writingPower).toBeCloseTo(1.375);
    expect(selectIncomePerMonth(founded)).toBeCloseTo(6.25);
    expect(getPrestigeRequirements(founded)).toEqual({ historicMembers: 200, collaborators: 10, events: 24 });

    const upgraded = gameReducer(
      { ...founded, school: { ...founded.school, euros: 100 } },
      { type: "BUY_UPGRADE", upgradeId: "comfortable-keyboard", now: 4_000 },
    );
    expect(upgraded.school.euros).toBe(14);
  });

  it("adds event capacity as the school network grows", () => {
    const initial = createInitialState(1_000);
    const archived = {
      id: "school-archive",
      name: "Sede precedente",
      city: "Genova",
      motto: "",
      specialization: "generale" as const,
      membersAtTransfer: 100,
      emailsSent: 20,
      eventsCompleted: 12,
      transferredAt: 1_000,
    };
    const networked = {
      ...initial,
      school: { ...initial.school, euros: 100, activeMembers: 10 },
      network: { ...initial.network, schools: [archived, { ...archived, id: "school-archive-2" }] },
    };

    const first = gameReducer(networked, { type: "START_ACQUISITION_EVENT", definitionId: "park-sparring", now: 2_000 });
    const second = gameReducer(first, { type: "START_ACQUISITION_EVENT", definitionId: "public-demo", now: 2_100 });

    expect(second.acquisitionEvents.filter((event) => event.status === "running")).toHaveLength(2);
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
    const initial = createInitialState(1_000);
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
});
