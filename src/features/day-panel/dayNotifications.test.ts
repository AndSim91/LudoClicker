import { describe, expect, it } from "vitest";

import { createInitialState } from "../../game/engine";
import {
  LIGHT_INFLATION_CAUSES,
  LIGHT_INFLATION_EVENT_TITLE,
  LIGHT_INFLATION_EVENT_VISIBILITY_MS,
} from "../../game/lightInflation";
import type { ContactStatus, GameState, ScheduledTrial } from "../../game/types";
import {
  DAY_NOTIFICATION_VISIBILITY_MS,
  DAY_TRIAL_GROUPING_UNLOCK_MEMBERS,
  DAY_TRIAL_NOTIFICATION_LIMIT,
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
  it("uses wall time only for light inflation and preserves game time for other notifications", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      lightInflation: {
        ...initial.lightInflation,
        event: {
          cause: LIGHT_INFLATION_CAUSES[0],
          occurredAt: 50_000,
          visibleUntil: 50_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
        },
      },
    };

    expect(selectDayNotifications(state, 90_000, 49_999)).not.toContainEqual(
      expect.objectContaining({ id: "light-inflation" }),
    );
    expect(selectDayNotifications(state, 90_000, 50_000)).toContainEqual(
      expect.objectContaining({
        id: "light-inflation",
        title: LIGHT_INFLATION_EVENT_TITLE,
        clock: "wall",
        expiresAt: 50_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
        expiryDurationMs: LIGHT_INFLATION_EVENT_VISIBILITY_MS,
      }),
    );
    expect(selectDayNotifications(
      state,
      50_000,
      50_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
    )).not.toContainEqual(
      expect.objectContaining({ id: "light-inflation" }),
    );
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
        detail: "1 programmata",
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
    state.lightInflation = {
      ...state.lightInflation,
      event: {
        cause: LIGHT_INFLATION_CAUSES[0],
        occurredAt: 99_000,
        visibleUntil: 99_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
      },
    };

    const notifications = selectDayNotifications(state, 100_000, 100_000);

    expect(notifications).toHaveLength(2);
    expect(notifications).toContainEqual(expect.objectContaining({ id: "light-inflation" }));
    expect(notifications.filter((notification) => notification.kind === "trial")).toHaveLength(0);
    expect(notifications).toContainEqual(expect.objectContaining({
      id: "trial-summary",
      kind: "trial-summary",
      phase: "in-progress",
      title: "6 lezioni di prova",
      detail: "2 programmate · 2 in corso · 1 iscritto · 1 non iscritto",
      tutorialTarget: true,
    }));
    expect(state.scheduledTrials).toHaveLength(6);
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
        detail: "100 in corso",
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
      detail: "Si disputa alla fine del mese.",
      clock: "game",
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
