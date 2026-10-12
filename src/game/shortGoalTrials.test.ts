import { describe, expect, it } from "vitest";
import { createNextShortGoal, getShortGoalProgress } from "../content/shortGoals";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./engine";
import { refreshShortGoalAvailability } from "./schoolProgressionFlow";
import type { GameState, ScheduledTrial } from "./types";

const trial = (id: string, status: ScheduledTrial["status"]): ScheduledTrial => ({
  id, contactId: id, startsAt: 0, resolvesAt: 0, resultSeed: 1, status,
});

function withTrials(euros: number): GameState {
  const initial = createInitialState(1_000);
  return {
    ...initial,
    school: { ...initial.school, euros },
    statistics: { ...initial.statistics, trialsBooked: 6 },
    scheduledTrials: [trial("a", "scheduled"), trial("b", "scheduled"), trial("c", "completed")],
  };
}

describe("Agenda in movimento", () => {
  it("counts the trials already on the calendar when it starts active", () => {
    const state = withTrials(0);
    const goal = createNextShortGoal(state, 1, 2_000);
    expect(goal).toMatchObject({ definitionId: "book-trials", isActive: true, baseline: 4 });
    expect(getShortGoalProgress({ ...state, shortGoal: goal })).toBe(2);
  });

  it("counts them on reactivation too", () => {
    const state = withTrials(0);
    const waiting: GameState = {
      ...state,
      shortGoal: {
        ...createNextShortGoal(state, 1, 0),
        baseline: 6,
        isActive: false,
        reactivationStartedAt: 0,
      },
    };
    const active = refreshShortGoalAvailability(waiting, GAME_CONFIG.shortGoalReactivationDelayMs);
    expect(active.shortGoal.isActive).toBe(true);
    expect(getShortGoalProgress(active)).toBe(2);
  });
});
