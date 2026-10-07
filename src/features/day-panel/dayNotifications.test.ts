import { describe, expect, it } from "vitest";

import { createInitialState } from "../../game/engine";
import {
  LIGHT_INFLATION_CAUSES,
  LIGHT_INFLATION_EVENT_VISIBILITY_MS,
} from "../../game/lightInflation";
import type { ContactStatus, GameState, ScheduledTrial } from "../../game/types";
import {
  DAY_NOTIFICATION_VISIBILITY_MS,
  DAY_TRIAL_GROUPING_UNLOCK_MEMBERS,
  DAY_TRIAL_NOTIFICATION_LIMIT,
  capDayPips,
  getDayAlertKey,
  getDayPipFill,
  getNarrativeEffects,
  selectDayNotifications,
} from "./dayNotifications";

type TrialPhase = "scheduled" | "in-progress" | "enrolled" | "lost";

function stateWithTrialPhases(
  phases: readonly TrialPhase[],
  tutorialTrialIndex?: number,
): GameState {
  const initial = createInitialState(100_000);
  const contacts = phases.map((phase, index) => {
    const status: ContactStatus = phase === "enrolled"
      ? "enrolled"
      : phase === "lost"
      ? "lost"
      : "trialScheduled";
    return {
      ...initial.contacts[0],
      id: `day-contact-${index}`,
      firstName: "Atleta",
      lastName: String(index + 1),
      status,
    };
  });
  const scheduledTrials: ScheduledTrial[] = phases.map((phase, index) => ({
    id: `day-trial-${index}`,
    contactId: contacts[index].id,
    startsAt: phase === "scheduled" ? 110_000 + index : 90_000 + index,
    resolvesAt: phase === "enrolled" || phase === "lost" ? 95_000 : 120_000,
    resultSeed: index,
    status: phase === "enrolled" || phase === "lost" ? "completed" : "scheduled",
    tutorialSceneId: index === tutorialTrialIndex ? "first-event" : undefined,
  }));

  return { ...initial, contacts, scheduledTrials };
}

describe("selectDayNotifications", () => {
  it("never lists Inflazione di Luce: it has its own full-screen scene", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      lightInflation: {
        ...initial.lightInflation,
        event: {
          cause: LIGHT_INFLATION_CAUSES[0],
          increase: 0.1,
          occurredAt: 50_000,
          visibleUntil: 50_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
        },
      },
    };

    expect(selectDayNotifications(state, 50_000)).toEqual([]);
  });
  it("keeps five trial notifications separate at the aggregation boundary", () => {
    const state = stateWithTrialPhases(
      Array.from({ length: DAY_TRIAL_NOTIFICATION_LIMIT }, () => "scheduled" as const),
    );

    const notifications = selectDayNotifications(state, 100_000);

    expect(notifications.filter((notification) => notification.kind === "trial")).toHaveLength(5);
    expect(notifications).not.toContainEqual(
      expect.objectContaining({ kind: "trial-summary" }),
    );
  });

  it("groups even one ordinary trial after the school has reached five members", () => {
    const state = stateWithTrialPhases(["scheduled"]);
    state.school = {
      ...state.school,
      activeMembers: DAY_TRIAL_GROUPING_UNLOCK_MEMBERS,
      peakActiveMembers: DAY_TRIAL_GROUPING_UNLOCK_MEMBERS,
    };

    expect(selectDayNotifications(state, 100_000)).toEqual([
      expect.objectContaining({
        id: "trial-summary",
        kind: "trial-summary",
        title: "1 lezione di prova",
        detail: "1 in programma",
      }),
    ]);
  });

  it("keeps Legendary and Secret Legendary trials outside the ordinary group", () => {
    const state = stateWithTrialPhases(["scheduled", "scheduled", "scheduled"]);
    state.school = {
      ...state.school,
      activeMembers: DAY_TRIAL_GROUPING_UNLOCK_MEMBERS,
      peakActiveMembers: DAY_TRIAL_GROUPING_UNLOCK_MEMBERS,
    };
    state.contacts[1] = { ...state.contacts[1], rarity: "legendary" };
    state.contacts[2] = {
      ...state.contacts[2],
      rarity: "legendary",
      secretLegendaryId: "marco-palena",
    };
    state.scheduledTrials[2] = {
      ...state.scheduledTrials[2],
      secretLegendaryId: "marco-palena",
    };

    const notifications = selectDayNotifications(state, 100_000);

    expect(notifications.filter((notification) => notification.kind === "trial-summary"))
      .toEqual([expect.objectContaining({ title: "1 lezione di prova" })]);
    expect(notifications.filter((notification) => notification.kind === "trial"))
      .toEqual([
        expect.objectContaining({ person: expect.objectContaining({ displayName: "Atleta 2" }) }),
        expect.objectContaining({
          person: expect.objectContaining({ displayName: "Atleta 3", secretLegendary: true }),
        }),
      ]);
  });

  it("condenses more than five trials into one minimal phase summary", () => {
    const state = stateWithTrialPhases([
      "scheduled",
      "scheduled",
      "in-progress",
      "in-progress",
      "enrolled",
      "lost",
    ], 0);

    const notifications = selectDayNotifications(state, 100_000);

    expect(notifications).toHaveLength(1);
    expect(notifications.filter((notification) => notification.kind === "trial")).toHaveLength(0);
    expect(notifications).toContainEqual(expect.objectContaining({
      id: "trial-summary",
      kind: "trial-summary",
      phase: "in-progress",
      title: "6 lezioni di prova",
      detail: "2 in programma, 2 in palestra, 1 iscritto e 1 senza iscrizione",
      pips: [
        { state: "enrolled", startsAt: 90_004 },
        { state: "lost", startsAt: 90_005 },
        { state: "live", startsAt: 90_002 },
        { state: "live", startsAt: 90_003 },
        { state: "waiting", startsAt: 110_000 },
        { state: "waiting", startsAt: 110_001 },
      ],
      tutorialTarget: true,
    }));
    expect(state.scheduledTrials).toHaveLength(6);
  });

  it("gives every trial a pip that fills while waiting and keeps its outcome colour", () => {
    expect(selectDayNotifications(stateWithTrialPhases(["scheduled"]), 100_000)[0].pips)
      .toEqual([{ state: "waiting", startsAt: 110_000 }]);
    expect(selectDayNotifications(stateWithTrialPhases(["enrolled"]), 100_000)[0].pips)
      .toEqual([{ state: "enrolled", startsAt: 90_000 }]);

    // 30 s wait: 10 s before the start the pip is two thirds full, then full.
    expect(getDayPipFill({ state: "waiting", startsAt: 110_000 }, 100_000)).toBeCloseTo(2 / 3);
    expect(getDayPipFill({ state: "waiting", startsAt: 110_000 }, 50_000)).toBe(0);
    expect(getDayPipFill({ state: "waiting", startsAt: 110_000 }, 120_000)).toBe(1);
  });

  it("caps the pips at eight, keeping each state's share and the trials about to start", () => {
    const waiting = Array.from({ length: 99 }, (_, index) => ({ state: "waiting" as const, startsAt: 200 - index }));
    const crowded = capDayPips([...waiting, { state: "live", startsAt: 1 }]);
    expect(crowded).toHaveLength(8);
    expect(crowded[0]).toEqual({ state: "live", startsAt: 1 });
    expect(crowded.slice(1).map((pip) => pip.startsAt)).toEqual([102, 103, 104, 105, 106, 107, 108]);

    const mixed = capDayPips([
      ...Array.from({ length: 50 }, (_, index) => ({ state: "enrolled" as const, startsAt: index })),
      ...Array.from({ length: 30 }, (_, index) => ({ state: "live" as const, startsAt: index })),
      ...Array.from({ length: 20 }, (_, index) => ({ state: "waiting" as const, startsAt: index })),
    ]);
    expect(mixed.map((pip) => pip.state)).toEqual([
      "enrolled", "enrolled", "enrolled", "enrolled", "live", "live", "waiting", "waiting",
    ]);
  });

  it("returns one notification for one hundred concurrent trials", () => {
    const state = stateWithTrialPhases(
      Array.from({ length: 100 }, () => "in-progress" as const),
    );

    expect(selectDayNotifications(state, 100_000)).toEqual([
      expect.objectContaining({
        kind: "trial-summary",
        phase: "in-progress",
        title: "100 lezioni di prova",
        detail: "100 in palestra",
      }),
    ]);
  });

  it("keeps the current month's tournament visible until it starts", () => {
    const initial = createInitialState(10_000);
    const state: GameState = {
      ...initial,
      school: {
        ...initial.school,
        currentMonth: 12,
        nextFeeAt: 70_000,
        fame: 6,
      },
    };

    expect(selectDayNotifications(state, 60_000)).toContainEqual({
      id: "tournament-school-1",
      kind: "tournament",
      phase: "scheduled",
      title: "Torneo Scolastico in arrivo",
      detail: "Si combatte a fine mese: c'è ancora tempo per allenarsi.",
      timestamp: 70_000,
      startsAt: 70_000,
    });
    expect(selectDayNotifications(state, 70_000)).not.toContainEqual(
      expect.objectContaining({ id: "tournament-school-1" }),
    );
  });

  it("does not announce a locked tournament or one in a future month", () => {
    const initial = createInitialState(10_000);
    const decemberState: GameState = {
      ...initial,
      school: {
        ...initial.school,
        currentMonth: 12,
        nextFeeAt: 70_000,
      },
    };
    const unlockedNovemberState: GameState = {
      ...decemberState,
      school: {
        ...decemberState.school,
        currentMonth: 11,
        fame: 6,
      },
    };

    expect(selectDayNotifications(decemberState, 60_000)).not.toContainEqual(
      expect.objectContaining({ kind: "tournament" }),
    );
    expect(selectDayNotifications(unlockedNovemberState, 60_000)).not.toContainEqual(
      expect.objectContaining({ kind: "tournament" }),
    );
  });

  it("replaces the tournament countdown with the result for ten seconds", () => {
    const initial = createInitialState(10_000);
    const completedAt = 70_000;
    const result = {
      id: "school-result",
      level: "school" as const,
      season: 1,
      completedAt,
      participants: [],
      matches: [],
      groupStandings: [],
      arenaRanking: [],
      styleRanking: [],
      arenaPodium: [],
      stylePodium: [],
      qualifiers: [],
      rewards: [],
      secretLegendaryDefeatedIds: [],
    };
    const completedState: GameState = {
      ...initial,
      school: {
        ...initial.school,
        currentMonth: 13,
        nextFeeAt: 130_000,
        fame: 6,
      },
      tournaments: {
        ...initial.tournaments,
        results: [result],
      },
    };

    expect(selectDayNotifications(completedState, completedAt)).toContainEqual(
      expect.objectContaining({
        id: "tournament-school-1",
        phase: "neutral",
        title: "Torneo Scolastico completato",
        expiresAt: completedAt + DAY_NOTIFICATION_VISIBILITY_MS,
      }),
    );
    expect(
      selectDayNotifications(completedState, completedAt + DAY_NOTIFICATION_VISIBILITY_MS),
    ).not.toContainEqual(expect.objectContaining({ id: "tournament-school-1" }));
  });

  it("keeps multiple Chronicles results in the same season distinct", () => {
    const initial = createInitialState(10_000);
    const baseResult = {
      level: "chronicles" as const,
      season: 1,
      completedAt: 70_000,
      participants: [],
      matches: [],
      groupStandings: [],
      arenaRanking: [],
      styleRanking: [],
      arenaPodium: [],
      stylePodium: [],
      qualifiers: [],
      rewards: [],
      secretLegendaryDefeatedIds: [],
    };
    const state: GameState = {
      ...initial,
      tournaments: {
        ...initial.tournaments,
        results: [
          { ...baseResult, id: "chronicles-a" },
          { ...baseResult, id: "chronicles-b", completedAt: 71_000 },
        ],
      },
    };

    expect(
      selectDayNotifications(state, 72_000)
        .filter((notification) => notification.kind === "tournament")
        .map((notification) => notification.id),
    ).toEqual(["tournament-chronicles-a", "tournament-chronicles-b"]);
  });
});

describe("Eventi, Imprevisti e avvisi (07/10)", () => {
  it("colours the pastiglie by what helps the school, not by the sign", () => {
    expect(getNarrativeEffects({ contacts: 2, euros: 1_000, wear: -30, repairedSwords: 1 }).map((effect) => [effect.amount, effect.good]))
      .toEqual([["+2", true], ["+1.000 €", true], ["−30", true], ["1", true]]);
    expect(getNarrativeEffects({ wear: 30, damagedSwords: 1 }).map((effect) => effect.good)).toEqual([false, false]);
  });

  it("makes negative events red Imprevisti with their effects, positive ones green Eventi", () => {
    const initial = createInitialState(10_000);
    const state: GameState = {
      ...initial,
      narrative: {
        ...initial.narrative,
        history: [
          { id: "bad", definitionId: "unexpected-repair", title: "Un piccolo disastro", occurredAt: 50_000, summary: "" },
          { id: "good", definitionId: "word-of-mouth", title: "Passaparola inatteso", occurredAt: 50_000, summary: "", effects: { contacts: 3 } },
          { id: "renewal", definitionId: "missed-renewal", title: "Mancato rinnovo", occurredAt: 50_000, summary: "Ciao." },
        ],
      },
    };
    const [bad, good, renewal] = ["bad", "good", "renewal"].map((id) =>
      selectDayNotifications(state, 51_000).find((notification) => notification.id === `important-event-${id}`)!);
    expect(bad).toMatchObject({ tone: "bad", eyebrow: "Imprevisto" });
    expect(bad.effects?.map((effect) => effect.text)).toEqual(["usura", "spada rotta"]);
    expect(good).toMatchObject({ tone: "good", eyebrow: "Evento" });
    expect(good.effects?.[0]).toMatchObject({ amount: "+3", keyword: "Contatti" });
    expect(renewal.tone).toBeUndefined();
    expect(getDayAlertKey(bad, 1)).toBe("important-event-bad");
    expect(getDayAlertKey(renewal, 1)).toBeNull();
  });

  it("gathers trials cancelled for lack of swords in one red card, an avviso once per month", () => {
    const initial = createInitialState(10_000);
    const contacts = [0, 1].map((index) => ({ ...initial.contacts[0], id: `c-${index}`, status: "lost" as const }));
    const state: GameState = {
      ...initial,
      contacts,
      scheduledTrials: contacts.map((contact, index) => ({
        id: `t-${index}`,
        contactId: contact.id,
        startsAt: 20_000,
        resolvesAt: 50_000,
        resultSeed: index,
        status: "cancelled" as const,
      })),
    };
    const cancelled = selectDayNotifications(state, 21_000).find((notification) => notification.kind === "trials-cancelled");
    expect(cancelled).toMatchObject({ title: "Prove annullate", tone: "bad", eyebrow: "Palestra" });
    expect(cancelled?.effects?.[0]).toMatchObject({ amount: "2", text: "prove saltate", good: false });
    expect(getDayAlertKey(cancelled!, 3)).toBe(getDayAlertKey({ ...cancelled!, id: "other" }, 3));
    expect(getDayAlertKey(cancelled!, 4)).not.toBe(getDayAlertKey(cancelled!, 3));
  });
});
