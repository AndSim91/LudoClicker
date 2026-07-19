import { describe, expect, it } from "vitest";
import { NARRATIVE_EVENTS } from "../content/narrativeEvents";
import { GAME_CONFIG } from "./config";
import {
  canFoundSchool,
  createInitialState,
  gameReducer,
  getPrestigeRequirements,
} from "./engine";
import { selectIncomePerMonth } from "./selectors";

describe("game engine: narrative", () => {
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

  it("records the student and rarity for a missed renewal", () => {
    const initial = createInitialState(1_000);
    const due = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, currentMonth: 7 },
      contacts: initial.contacts.map((contact, index) => index < 2
        ? {
            ...contact,
            firstName: index === 0 ? "Allievo" : "Secondo",
            lastName: "Storico",
            status: "enrolled" as const,
            rarity: index === 0 ? "rare" as const : "legendary" as const,
          }
        : contact),
      narrative: { ...initial.narrative, nextEventAt: 2_000 },
    };
    const resolved = Array.from({ length: 100 }, (_, randomSeed) =>
      gameReducer({ ...due, randomSeed }, { type: "TICK", now: 2_000 }),
    ).find((candidate) => candidate.narrative.history[0]?.definitionId === "missed-renewal");

    expect(resolved).toBeDefined();
    const event = resolved!.narrative.history[0];
    expect(event.person?.displayName).toBe("Allievo Storico");
    const affectedMember = due.contacts.find((contact) =>
      `${contact.firstName} ${contact.lastName}` === event.person?.displayName,
    );
    expect(event.person?.rarity).toBe(affectedMember?.rarity);
    expect(resolved!.contacts.find((contact) => contact.id === affectedMember?.id)?.status)
      .toBe("departed");
    expect(resolved!.contacts.find((contact) => contact.firstName === "Secondo")?.status)
      .toBe("enrolled");
    expect(resolved!.contacts.filter((contact) => contact.status === "enrolled")).toHaveLength(1);
    expect(resolved!.school.activeMembers).toBe(1);
    expect(resolved!.statistics.membersDeparted).toBe(1);
  });

  it("allows missed renewals only in July and August", () => {
    const initial = createInitialState(1_000);
    const due = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, currentMonth: 10 },
      contacts: initial.contacts.map((contact, index) => index < 2
        ? { ...contact, status: "enrolled" as const }
        : contact),
      narrative: { ...initial.narrative, nextEventAt: 2_000 },
    };

    const octoberResults = Array.from({ length: 100 }, (_, randomSeed) =>
      gameReducer({ ...due, randomSeed }, { type: "TICK", now: 2_000 }),
    );

    expect(octoberResults.every(
      (result) => result.narrative.history[0]?.definitionId !== "missed-renewal",
    )).toBe(true);
  });

  it("includes the amount in an extraordinary contribution notification", () => {
    const initial = createInitialState(1_000);
    const due = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, activeMembers: 3 },
      contacts: initial.contacts.map((contact, index) => index < 3
        ? { ...contact, status: "enrolled" as const }
        : contact),
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
      school: { ...initial.school, activeMembers: 80, historicMembers: 1_000, euros: 500 },
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
      statistics: { ...initial.statistics, eventsCompleted: 50, emailsSent: 30 },
      upgrades: { ...initial.upgrades, "comfortable-keyboard": 2 },
      tournaments: {
        ...initial.tournaments,
        championsVictoryCurrentSchool: true,
      },
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
    expect(founded.school.historicMembers).toBe(1_000);
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
    expect(getPrestigeRequirements(founded)).toEqual({ historicMembers: 2_000, collaborators: 10, events: 100 });

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

  it("keeps existing drafts on their generated catalog when an email upgrade is bought", () => {
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
      upgradeId: "professional-email",
      now: 2_000,
    });

    expect(withLayout.emails[0].presentationLevel).toBe(0);
    expect(withLayout.emails[1].presentationLevel).toBe(0);
  });
});
