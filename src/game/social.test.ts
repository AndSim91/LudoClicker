import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState, gameReducer } from "./engine";
import {
  getMonthlySocialIncome,
  getSocialContactChanceCap,
  getSocialContentCharacters,
  getSocialContactChance,
  getSocialFollowerChance,
  getSocialFollowerValue,
} from "./social";

describe("Social", () => {
  it("uses the approved base values", () => {
    const levels = createInitialState(1_000).upgrades;

    expect(GAME_CONFIG.socialUnlockMembers).toBe(35);
    expect(getSocialContentCharacters(levels)).toBe(7_500);
    expect(getSocialFollowerChance(levels)).toBe(0.05);
    expect(getSocialContactChance(0, levels)).toBe(0.005);
    expect(getSocialContactChanceCap(levels)).toBe(0.05);
    expect(getSocialFollowerValue(levels)).toBe(0.01);
  });

  it("scales contact probability with followers up to the current cap", () => {
    const levels = createInitialState(1_000).upgrades;

    expect(getSocialContactChance(100, levels)).toBeCloseTo(0.015);
    expect(getSocialContactChance(1_000, levels)).toBe(0.05);
    expect(getSocialContactChance(10_000, {
      ...levels,
      "social-content-distribution": 5,
    })).toBe(0.25);
  });

  it("uses the approved upgrade ladders", () => {
    const levels = createInitialState(1_000).upgrades;
    const maximum = {
      ...levels,
      "social-content-synthesis": 4,
      "social-editorial-plan": 5,
      "social-content-distribution": 5,
      "social-sponsorships": 5,
    };

    expect(getSocialContentCharacters(maximum)).toBe(1_000);
    expect(getSocialFollowerChance(maximum)).toBe(0.1);
    expect(getSocialContactChanceCap(maximum)).toBe(0.25);
    expect(getSocialFollowerValue(maximum)).toBe(0.5);
  });

  it("collects sponsorships monthly and applies only A.N.D.E.R.", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, followers: 1_000 },
      unlocks: { ...initial.unlocks, social: true },
      upgrades: {
        ...initial.upgrades,
        "registration-form": 5,
        "order-secretariat": 2,
      },
    };

    expect(getMonthlySocialIncome(state)).toBe(14);
  });

  it("credits sponsorships with the monthly fees instead of content cycles", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, followers: 1_000 },
      unlocks: { ...initial.unlocks, social: true },
    };

    const collected = gameReducer(state, {
      type: "TICK",
      now: state.school.nextFeeAt,
    });

    expect(collected.school.euros).toBe(10);
    expect(collected.statistics.eurosEarned).toBe(10);
    expect(collected.statistics.socialContentCycles).toBe(0);
  });
});
