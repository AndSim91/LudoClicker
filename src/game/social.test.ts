import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState, gameReducer } from "./engine";
import {
  getMonthlySocialIncome,
  getSocialContentCharacters,
  getSocialDoubleFollowerChance,
  getSocialEventPromotionBonus,
  getSocialEventPromotionCap,
  getSocialFollowerChance,
  getSocialFollowerValue,
} from "./social";

describe("Social", () => {
  it("uses the approved base values", () => {
    const levels = createInitialState(1_000).upgrades;

    expect(GAME_CONFIG.socialUnlockMembers).toBe(35);
    expect(getSocialContentCharacters(levels)).toBe(100_000);
    expect(getSocialFollowerChance(levels)).toBe(0.5);
    expect(getSocialDoubleFollowerChance(levels)).toBe(0);
    expect(getSocialEventPromotionBonus(0, levels)).toBe(0);
    expect(getSocialEventPromotionCap(levels)).toBe(0.05);
    expect(getSocialFollowerValue(levels)).toBe(0.1);
  });

  it("turns followers into a capped Event promotion bonus", () => {
    const levels = createInitialState(1_000).upgrades;

    expect(getSocialEventPromotionBonus(100, levels)).toBeCloseTo(0.01);
    expect(getSocialEventPromotionBonus(1_000, levels)).toBe(0.05);
    expect(getSocialEventPromotionBonus(10_000, {
      ...levels,
      "social-content-distribution": 5,
    })).toBe(0.3);
  });

  it("uses the approved upgrade ladders", () => {
    const levels = createInitialState(1_000).upgrades;
    const maximum = {
      ...levels,
      "social-content-synthesis": 5,
      "social-editorial-plan": 5,
      "social-content-distribution": 5,
      "social-sponsorships": 4,
    };

    expect(getSocialContentCharacters(maximum)).toBe(50_000);
    expect(getSocialFollowerChance(maximum)).toBe(0.95);
    expect(getSocialDoubleFollowerChance(maximum)).toBe(0.05);
    expect(getSocialEventPromotionCap(maximum)).toBe(0.3);
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

    expect(getMonthlySocialIncome(state)).toBe(140);
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

    expect(collected.school.euros).toBe(100);
    expect(collected.statistics.eurosEarned).toBe(100);
    expect(collected.statistics.socialContentCycles).toBe(0);
  });
});
