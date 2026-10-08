import { describe, expect, it } from "vitest";
import { NARRATIVE_EVENTS } from "../content/narrativeEvents";
import { createShortGoalFromStatistics, getShortGoalReward } from "../content/shortGoals";
import { GAME_CONFIG } from "./config";
import {
  canFoundSchool,
  createInitialState,
  gameReducer,
  getPrestigeRequirements,
} from "./engine";
import { selectIncomePerMonth } from "./selectors";
import { formatCurrency } from "../shared/formatters";

describe("game engine: narrative", () => {
  it("grants each achievement only once, without reward", () => {
    const initial = createInitialState(1_000);
    const qualifying = {
      ...initial,
      statistics: { ...initial.statistics, emailsSent: 1 },
    };

    const earned = gameReducer(qualifying, { type: "TICK", now: 2_000 });
    const repeated = gameReducer(earned, { type: "TICK", now: 2_000 });

    expect(earned.achievements).toContain("emails:bronze");
    expect(earned.school.euros).toBe(initial.school.euros);
    expect(earned.messages.some((message) =>
      message.subject === "Nuovo traguardo: La tastiera chiede pietà · Bronzo")).toBe(true);
    expect(repeated).toBe(earned);
    expect(repeated.achievements.filter((id) => id === "emails:bronze")).toHaveLength(1);
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

    expect(completed.school.euros).toBe(50);
    expect(completed.shortGoal.definitionId).toBe("book-trials");
    expect(completed.shortGoal.completedCount).toBe(1);
    expect(completed.messages[0].subject).toBe("Missione compiuta: Inviti in partenza");
    expect(completed.messages[0].preview).toMatch(/\+50,00\s€\.$/);
    expect(repeated.school.euros).toBe(completed.school.euros);
  });

  it("caps mission targets and multiplies the reward by the series", () => {
    const statistics = createInitialState(1_000).statistics;
    // Order: email, prove, iscrizioni, Eventi.
    expect(createShortGoalFromStatistics(statistics, 2, 0).definitionId).toBe("enroll-member");
    expect(createShortGoalFromStatistics(statistics, 3, 0).definitionId).toBe("complete-event");
    // Series 2 (one full round done): 3 emails for 100 €.
    const second = createShortGoalFromStatistics(statistics, 4, 0);
    expect(second.target).toBe(3);
    expect(getShortGoalReward(second)).toBe(100);
    // Series 9: targets stuck at 5, reward still growing by 50 € a series.
    const ninth = createShortGoalFromStatistics(statistics, 35, 0);
    expect(ninth.definitionId).toBe("complete-event");
    expect(ninth.target).toBe(5);
    expect(getShortGoalReward(ninth)).toBe(450);
  });

  it("hides a zero-progress short goal at exactly 10,000 euros", () => {
    const initial = createInitialState(1_000);
    const inactive = gameReducer(
      {
        ...initial,
        school: { ...initial.school, euros: 10_000 },
      },
      { type: "TICK", now: 2_000 },
    );

    expect(inactive.school.euros).toBe(10_000);
    expect(inactive.shortGoal).toMatchObject({
      definitionId: "send-emails",
      baseline: 0,
      completedCount: 0,
      isActive: false,
    });
  });

  it("reactivates a hidden short goal after 60 continuous seconds below 10,000 euros", () => {
    const initial = createInitialState(1_000);
    const inactive = gameReducer(
      { ...initial, school: { ...initial.school, euros: 10_000 } },
      { type: "TICK", now: 2_000 },
    );
    const waiting = gameReducer(
      {
        ...inactive,
        achievements: ["first-email" as const],
        school: { ...inactive.school, euros: 9_999 },
        statistics: { ...inactive.statistics, emailsSent: 2 },
      },
      { type: "TICK", now: 3_000 },
    );
    const almostReady = gameReducer(waiting, { type: "TICK", now: 62_999 });
    const active = gameReducer(almostReady, { type: "TICK", now: 63_000 });

    expect(waiting.shortGoal).toMatchObject({
      baseline: 2,
      isActive: false,
      reactivationStartedAt: 3_000,
    });
    expect(almostReady.shortGoal.isActive).toBe(false);
    expect(active.shortGoal).toMatchObject({
      baseline: 2,
      isActive: true,
    });
    expect(active.shortGoal.reactivationStartedAt).toBeUndefined();
  });

  it("restarts the reactivation timer if the balance returns to 10,000 euros", () => {
    const initial = createInitialState(1_000);
    const inactive = gameReducer(
      { ...initial, school: { ...initial.school, euros: 10_000 } },
      { type: "TICK", now: 2_000 },
    );
    const firstWait = gameReducer(
      { ...inactive, school: { ...inactive.school, euros: 9_999 } },
      { type: "TICK", now: 3_000 },
    );
    const reset = gameReducer(
      { ...firstWait, school: { ...firstWait.school, euros: 10_000 } },
      { type: "TICK", now: 32_000 },
    );
    const secondWait = gameReducer(
      { ...reset, school: { ...reset.school, euros: 9_999 } },
      { type: "TICK", now: 33_000 },
    );
    const almostReady = gameReducer(secondWait, { type: "TICK", now: 92_999 });
    const active = gameReducer(almostReady, { type: "TICK", now: 93_000 });

    expect(reset.shortGoal.reactivationStartedAt).toBeUndefined();
    expect(secondWait.shortGoal.reactivationStartedAt).toBe(33_000);
    expect(almostReady.shortGoal.isActive).toBe(false);
    expect(active.shortGoal.isActive).toBe(true);
  });

  it("keeps a progressed short goal active above 10,000 euros until completion", () => {
    const initial = createInitialState(1_000);
    const protectedGoal = gameReducer(
      {
        ...initial,
        achievements: ["first-email" as const],
        school: { ...initial.school, euros: 10_000 },
        statistics: { ...initial.statistics, emailsSent: 1 },
      },
      { type: "TICK", now: 2_000 },
    );

    const completed = gameReducer(
      {
        ...protectedGoal,
        statistics: { ...protectedGoal.statistics, emailsSent: 3 },
      },
      { type: "TICK", now: 3_000 },
    );

    expect(protectedGoal.shortGoal).toMatchObject({
      definitionId: "send-emails",
      isActive: true,
    });
    expect(completed.school.euros).toBe(10_050);
    expect(completed.shortGoal).toMatchObject({
      definitionId: "book-trials",
      completedCount: 1,
      isActive: false,
    });
  });

  it("marks the whole inbox as read in one action", () => {
    const initial = createInitialState(1_000);
    const read = gameReducer(initial, { type: "MARK_ALL_MESSAGES_READ" });

    expect(read.messages.every((message) => !message.unread)).toBe(true);
  });

  it("also reads secondary notifications materialized by the same action", () => {
    const initial = createInitialState(1_000);
    const withPendingAchievement = {
      ...initial,
      statistics: { ...initial.statistics, emailsSent: 1 },
    };

    const read = gameReducer(withPendingAchievement, { type: "MARK_ALL_MESSAGES_READ" });

    expect(read.achievements).toContain("emails:bronze");
    expect(read.messages.some((message) => message.category === "other")).toBe(true);
    expect(read.messages.every((message) => !message.unread)).toBe(true);
  });

  it("resolves a due narrative event once and schedules the next one", () => {
    const initial = createInitialState(1_000);
    const due = {
      ...initial,
      school: { ...initial.school, activeMembers: 5 },
      narrative: { ...initial.narrative, nextEventAt: 2_000 },
    };

    const resolved = gameReducer(due, { type: "TICK", now: 2_000 });
    const repeated = gameReducer(resolved, { type: "TICK", now: 2_000 });

    expect(resolved.narrative.history).toHaveLength(1);
    expect(resolved.statistics.narrativeEvents).toBe(1);
    expect(resolved.narrative.nextEventAt).toBeGreaterThan(2_000);
    expect(repeated.narrative.history).toHaveLength(1);
  });

  it("holds Eventi e Imprevisti until the school has 5 members", () => {
    const initial = createInitialState(1_000);
    const due = {
      ...initial,
      school: { ...initial.school, activeMembers: 4 },
      narrative: { ...initial.narrative, nextEventAt: 2_000 },
    };

    const held = gameReducer(due, { type: "TICK", now: 2_000 });

    expect(held.narrative.history).toHaveLength(0);
    expect(held.narrative.nextEventAt).toBeGreaterThan(2_000);
  });

  it("never resolves a missed renewal as a random narrative event", () => {
    const initial = createInitialState(1_000);
    const due = {
      ...initial,
      school: { ...initial.school, activeMembers: 5, currentMonth: 7 },
      contacts: initial.contacts.map((contact, index) => index < 5
        ? { ...contact, status: "enrolled" as const }
        : contact),
      narrative: { ...initial.narrative, nextEventAt: 2_000 },
    };
    const results = Array.from({ length: 100 }, (_, randomSeed) =>
      gameReducer({ ...due, randomSeed }, { type: "TICK", now: 2_000 }),
    );

    expect(results.every(
      (result) => result.narrative.history[0]?.definitionId !== "missed-renewal",
    )).toBe(true);
    expect(results.every((result) => result.statistics.membersDeparted === 0)).toBe(true);
  });

  it("includes the amount in an extraordinary contribution notification", () => {
    const initial = createInitialState(1_000);
    const due = {
      ...initial,
      randomSeed: 0,
      school: { ...initial.school, activeMembers: 5 },
      contacts: initial.contacts.map((contact, index) => index < 5
        ? { ...contact, status: "enrolled" as const }
        : contact),
      narrative: { ...initial.narrative, nextEventAt: 2_000 },
    };

    const resolved = Array.from({ length: 100 }, (_, randomSeed) =>
      gameReducer({ ...due, randomSeed }, { type: "TICK", now: 2_000 }),
    ).find((candidate) => candidate.narrative.history[0]?.definitionId === "extra-donation");
    // 4.1: narrative events are counted in the yearly digest; the text stays in the history.
    const contribution = { preview: resolved?.narrative.history[0].summary };

    expect(resolved).toBeDefined();
    const definition = NARRATIVE_EVENTS.find((event) => event.id === "extra-donation")!;
    expect(contribution?.preview).toContain(
      `Contributo ricevuto: ${formatCurrency(definition.euroDelta!)}.`,
    );
    expect(resolved!.narrative.history[0].summary).toBe(contribution?.preview);
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
      school: { ...initial.school, activeMembers: 80, fame: 150, euros: 500 },
      contacts: initial.contacts.map((contact, index) => index === 0
        ? {
            ...contact,
            firstName: "Eva",
            lastName: "Parodi",
            status: "enrolled" as const,
            rarity: "legendary" as const,
            specialProfileId: "eva-parodi" as const,
            forms: ["form-1" as const],
            arenaBase: 91,
            styleBase: 87,
            agonistCourseCompletions: 2,
            agonistCourseArenaBonus: 4,
            agonistCourseStyleBonus: 6,
            enrolledMonth: 1,
          }
        : contact),
      collaborators,
      legendaryCollaborators: {
        ...initial.legendaryCollaborators,
        encounteredProfileIds: ["eva-parodi" as const],
        enrolledProfileIds: ["eva-parodi" as const],
        // Met in an earlier school, with everything earned there.
        retainedProgress: {
          "marco-palena": {
            forms: ["form-1" as const, "form-2" as const],
            instructorForms: ["form-1" as const],
            joinedAt: 10,
            arenaBase: 80,
            styleBase: 70,
            agonistCourseCompletions: 3,
          },
        },
      },
      statistics: { ...initial.statistics, eventsCompleted: 25, emailsSent: 30 },
      upgrades: { ...initial.upgrades, "comfortable-keyboard": 2, "project-x": 1 },
      secretUpgradeDiscoveries: ["project-x" as const],
      tournaments: {
        ...initial.tournaments,
        ordinaryVictoryAchieved: true,
        championsVictoryCurrentSchool: true,
        nationalTitlesCurrentSchool: 2,
      },
    };

    expect(canFoundSchool(eligible)).toBe(true);
    const offered = gameReducer(eligible, { type: "TICK", now: 2_000 });
    const offeredAgain = gameReducer(offered, { type: "TICK", now: 2_000 });
    const founded = gameReducer(offeredAgain, {
      type: "FOUND_SCHOOL",
      now: 3_000,
      details: { name: "Ordine del Faro", city: "Trieste" },
    });

    expect(offered.messages.filter((message) => message.subject === "Primi all'Accademico")).toHaveLength(1);
    expect(offeredAgain.messages.filter((message) => message.subject === "Primi all'Accademico")).toHaveLength(1);
    expect(founded.school.name).toBe("Ordine del Faro");
    expect(founded.school.city).toBe("Trieste");
    // Eva Parodi, the only Leggendario, follows the player as the first member.
    expect(founded.school.activeMembers).toBe(1);
    // The Fama belongs to the school: the new one starts from zero.
    expect(founded.school.fame).toBe(0);
    expect(founded.collaborators.map((collaborator) => collaborator.specialProfileId)).toEqual(["eva-parodi"]);
    expect(founded.contacts).toHaveLength(6);
    expect(founded.contacts.filter((contact) => contact.status === "enrolled")
      .map((contact) => contact.specialProfileId)).toEqual(["eva-parodi"]);
    expect(founded.legendaryCollaborators.enrolledProfileIds).toEqual(["eva-parodi"]);
    // She follows without anything she earned: no Forms, attestati or course bonuses.
    expect(founded.legendaryCollaborators.retainedProgress["eva-parodi"]).toEqual({
      forms: [],
      instructorForms: [],
      technicianForms: [],
      formBranchPreferences: [],
      joinedAt: 3_000,
      arenaBase: 91,
      styleBase: 87,
    });
    // Every other Leggendario starts from zero too when met again.
    expect(founded.legendaryCollaborators.retainedProgress["marco-palena"]).toEqual({
      forms: [],
      instructorForms: [],
      technicianForms: [],
      formBranchPreferences: [],
      joinedAt: 10,
      arenaBase: 80,
      styleBase: 70,
    });
    expect(founded.contacts.find((contact) => contact.specialProfileId === "eva-parodi")).toMatchObject({
      forms: [],
      agonistCourseCompletions: 0,
      agonistCourseArenaBonus: 0,
      agonistCourseStyleBonus: 0,
      tournamentExperience: 0,
    });
    expect(founded.collaborators[0]).toMatchObject({ forms: [], instructorForms: [] });
    expect(founded.legendaryCollaborators.encounteredProfileIds).toEqual(
      expect.arrayContaining(initial.legendaryCollaborators.encounteredProfileIds),
    );
    expect(founded.upgrades["comfortable-keyboard"]).toBe(0);
    expect(founded.upgrades["project-x"]).toBe(0);
    expect(founded.secretUpgradeDiscoveries).toEqual(["project-x"]);
    // The Accademico title (counted from the national one) 1 point, 150 Fama 1 (√(150/128)),
    // the national title and the Champion's Arena 2 each. Nothing spent.
    expect(founded.network.reputation).toBe(6);
    // The map keeps only name, city and Fama of the school left behind.
    expect(founded.network.schools).toEqual([{ name: eligible.school.name, city: eligible.school.city, fame: eligible.school.fame }]);
    expect(founded.network).toMatchObject({ schoolCount: 1, monthlyRent: 0 });
    expect(founded.tournaments.nationalTitlesCurrentSchool).toBeUndefined();
    expect(founded.tournaments.academyTitlesCurrentSchool).toBeUndefined();
    expect(founded.tournaments.ordinaryVictoryAchieved).toBe(true);
    // Founding alone gives no bonus: only the Reputation spent does.
    expect(founded.player.writingPower).toBeCloseTo(1);
    // Only the fee of the Leggendario who followed.
    expect(selectIncomePerMonth(founded)).toBe(40);
    expect(getPrestigeRequirements(founded)).toEqual({ academyTitles: 1, currentAcademyTitles: 0 });

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
    expect(postPrestigeContacts.contacts).toHaveLength(10);

    const upgraded = gameReducer(
      { ...founded, school: { ...founded.school, euros: 100 } },
      { type: "BUY_UPGRADE", upgradeId: "comfortable-keyboard", now: 4_000 },
    );
    expect(upgraded.school.euros).toBe(87);
  });

  it("runs events together while both members and swords remain available", () => {
    const initial = createInitialState(1_000);
    const resourced = {
      ...initial,
      school: {
        ...initial.school,
        euros: 2_500,
        activeMembers: 5,
        peakActiveMembers: 5,
        fame: 5,
      },
    };

    const first = gameReducer(resourced, { type: "START_ACQUISITION_EVENT", definitionId: "public-demo", now: 2_000 });
    const second = gameReducer(first, { type: "START_ACQUISITION_EVENT", definitionId: "organized-flyering", now: 2_100 });
    const blockedByCapacity = gameReducer(second, { type: "START_ACQUISITION_EVENT", definitionId: "organized-flyering", now: 2_200 });

    expect(second.acquisitionEvents.filter((event) => event.status === "running")).toHaveLength(2);
    expect(second.equipment.availableSwords).toBe(0);
    expect(second.acquisitionEvents.map((event) => event.membersUsed)).toEqual([2, 2]);
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

    const completed = gameReducer(ready, { type: "WRITE", now: 2_000 });
    const sending = gameReducer(completed, { type: "SEND_EMAIL", now: 2_000 });
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
      school: { ...initial.school, fame: 1 },
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
      school: { ...initial.school, euros: 10_000, fame: 15 },
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
