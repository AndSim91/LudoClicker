import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { buyUpgrade } from "./upgradeFlow";

describe("buyUpgrade prerequisites", () => {
  it("blocks a later branch upgrade until every previous upgrade is complete", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 10_000, historicMembers: 100 },
    };

    expect(buyUpgrade(state, "quick-phrases")).toBe(state);

    const eligibleState = {
      ...state,
      upgrades: { ...state.upgrades, "comfortable-keyboard": 5 },
    };
    const upgradedState = buyUpgrade(eligibleState, "quick-phrases");

    expect(upgradedState.upgrades["quick-phrases"]).toBe(1);
    expect(upgradedState.school.euros).toBeLessThan(eligibleState.school.euros);
  });
});
