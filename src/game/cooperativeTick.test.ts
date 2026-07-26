import { describe, expect, it } from "vitest";
import { gameReducer } from "./engine";
import { createInitialState } from "./initialState";
import type { AcquisitionEvent, GameState } from "./types";

const NOW = 75_000;

function createDueEvents(count: number): AcquisitionEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `event-${index}`,
    definitionId: "park-sparring",
    title: `Evento ${index}`,
    location: "Luogo test",
    startedAt: NOW - 1_000,
    resolvesAt: NOW,
    cost: 0,
    peopleMet: index % 3,
    demonstrationsGiven: index % 2,
    contactReward: 0,
    membersUsed: 0,
    equipmentUsed: 0,
    wearAdded: 0,
    status: "running",
  }));
}

function createStateWithDueEvents(count: number): GameState {
  const state = createInitialState(1_000, "", false);
  return {
    ...state,
    school: {
      ...state.school,
      nextFeeAt: NOW + 60_000,
    },
    automation: {
      ...state.automation,
      lastProcessedAt: NOW,
    },
    narrative: {
      ...state.narrative,
      nextEventAt: NOW + 120_000,
    },
    acquisitionEvents: createDueEvents(count),
  };
}

describe("cooperative tick work", () => {
  it("preserves event order and results across bounded work slices", () => {
    const state = createStateWithDueEvents(250);
    const completedInOneTick = gameReducer(state, { type: "TICK", now: NOW });

    const firstSlice = gameReducer(state, {
      type: "TICK",
      now: NOW,
      stepBudget: 8,
      workBudget: 100,
    });
    expect(firstSlice.acquisitionEvents.filter((event) =>
      event.status === "running"
    )).toHaveLength(150);

    let sliced = firstSlice;
    for (let slice = 0; slice < 2; slice += 1) {
      sliced = gameReducer(sliced, {
        type: "TICK",
        now: NOW,
        stepBudget: 8,
        workBudget: 100,
      });
    }

    expect(sliced).toEqual(completedInOneTick);
  });
});
