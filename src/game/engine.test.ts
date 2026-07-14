import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState, gameReducer } from "./engine";
import { getEmailBookingChance, getEnrollmentChance } from "./formulas";
import {
  selectActiveEmail,
  selectIncomePerMinute,
  selectSentEmailStatus,
  selectUnreadMessages,
} from "./selectors";

describe("game engine", () => {
  it("creates a playable tutorial state", () => {
    const state = createInitialState(1_000);

    expect(state.contacts).toHaveLength(10);
    expect(state.contacts.filter((contact) => contact.status === "available")).toHaveLength(9);
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
    expect(state.school.euros).toBe(GAME_CONFIG.firstEnrollmentFee);
    expect(state.unlocks.upgrades).toBe(true);
    expect(state.statistics.trialsBooked).toBe(1);
    expect(state.statistics.membersEnrolled).toBe(1);
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

    expect(paid.school.euros).toBe(2 * GAME_CONFIG.memberFee);
    expect(sameTick.school.euros).toBe(paid.school.euros);
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

  it("calculates income per minute from active members", () => {
    const state = createInitialState(1_000);
    const withMembers = { ...state, school: { ...state.school, activeMembers: 3 } };

    expect(selectIncomePerMinute(withMembers)).toBe(3 * GAME_CONFIG.memberFee);
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
    expect(completed.statistics.contactsAcquired).toBe(2);
    expect(completed.statistics.eventsCompleted).toBe(1);
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
    const funded = { ...state, school: { ...state.school, euros: 20 } };
    const started = gameReducer(funded, {
      type: "START_ACQUISITION_EVENT",
      definitionId: "public-demo",
      now: 2_000,
    });

    expect(blocked).toBe(state);
    expect(started.school.euros).toBe(5);
    expect(started.acquisitionEvents).toHaveLength(1);
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
      school: { ...initial.school, euros: 100, historicMembers: 1 },
      unlocks: { upgrades: true },
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
    expect(first.school.euros).toBe(85);
    expect(second.upgrades["prepared-presentation"]).toBe(2);
    expect(second.school.euros).toBe(67);
  });

  it("allows buying an upgrade as soon as the balance covers its price", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, euros: 20 },
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
      school: { ...initial.school, euros: 100, historicMembers: 1 },
      unlocks: { upgrades: true },
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
    expect(eventStarted.acquisitionEvents[0].contactReward).toBe(3);
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
});
