import { describe, expect, it } from "vitest";

import { createInitialState } from "../../game/engine";
import { LIGHT_INFLATION_CAUSES, LIGHT_INFLATION_EVENT_TITLE } from "../../game/lightInflation";
import type { ContactStatus, GameState, ScheduledTrial } from "../../game/types";
import {
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
          visibleUntil: 70_000,
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
        expiresAt: 70_000,
        expiryDurationMs: 20_000,
      }),
    );
    expect(selectDayNotifications(state, 50_000, 70_000)).not.toContainEqual(
      expect.objectContaining({ id: "light-inflation" }),
    );
  });

  it("keeps ten trial notifications separate at the aggregation boundary", () => {
    const state = stateWithTrialPhases(
      Array.from({ length: DAY_TRIAL_NOTIFICATION_LIMIT }, () => "scheduled" as const),
    );

    const notifications = selectDayNotifications(state, 100_000);

    expect(notifications.filter((notification) => notification.kind === "trial")).toHaveLength(10);
    expect(notifications).not.toContainEqual(
      expect.objectContaining({ kind: "trial-summary" }),
    );
  });

  it("condenses more than ten trials into one minimal phase summary", () => {
    const state = stateWithTrialPhases([
      "scheduled",
      "scheduled",
      "scheduled",
      "in-progress",
      "in-progress",
      "in-progress",
      "in-progress",
      "enrolled",
      "enrolled",
      "lost",
      "lost",
    ], 0);
    state.lightInflation = {
      ...state.lightInflation,
      event: {
        cause: LIGHT_INFLATION_CAUSES[0],
        occurredAt: 99_000,
        visibleUntil: 120_000,
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
      title: "11 lezioni di prova",
      detail: "3 programmate · 4 in corso · 2 iscritti · 2 non iscritti",
      tutorialTarget: true,
    }));
    expect(state.scheduledTrials).toHaveLength(11);
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
});
