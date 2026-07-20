import { describe, expect, it } from "vitest";
import {
  UPGRADE_DEFINITIONS,
  createInitialUpgradeLevels,
  getAnnualFormTrainingLimit,
  getUpgradeCost,
  getUpgradeEffectTotal,
  hasFreeFormTraining,
} from "./upgrades";
import type { UpgradeId } from "../game/types";

function maxedUpgrade(id: UpgradeId) {
  return { ...createInitialUpgradeLevels(), [id]: 5 };
}

describe("speed upgrade effects", () => {
  it.each([
    ["comfortable-keyboard", "writingPower", 2],
    ["quick-phrases", "writingPower", 3],
    ["automatic-signature", "automationMultiplier", 1],
    ["automatic-signature", "writingPower", 4],
    ["smart-fields", "writingPower", 5],
    ["instant-review", "automationMultiplier", 1],
    ["instant-review", "writingPower", 5],
    ["mail-merge", "automationMultiplier", 1],
    ["mail-merge", "writingPower", 5],
  ] as const)("applies the maximum effect of %s to %s", (id, effect, expected) => {
    expect(getUpgradeEffectTotal(maxedUpgrade(id), effect)).toBe(expected);
  });

  it("hits the agreed writing automation checkpoints", () => {
    const base = createInitialUpgradeLevels();
    const firstHalf = {
      ...base,
      "comfortable-keyboard": 5,
      "quick-phrases": 5,
      "automatic-signature": 5,
    };
    const fullSpeed = {
      ...firstHalf,
      "smart-fields": 5,
      "instant-review": 5,
      "mail-merge": 5,
    };
    const fullOrganization = {
      ...fullSpeed,
      "shared-calendar": 5,
      "collaborator-shifts": 5,
      "multi-site-coordination": 5,
    };
    const rate = (levels: typeof base) => 5 *
      (1 + getUpgradeEffectTotal(levels, "writingPower")) *
      (1 + getUpgradeEffectTotal(levels, "automationMultiplier"));

    expect(rate(base)).toBe(5);
    expect(rate(firstHalf)).toBe(100);
    expect(rate(fullSpeed)).toBe(500);
    expect(rate(fullOrganization)).toBe(1_500);
  });
});

describe("instructor branch", () => {
  it("uses the agreed linear order, gate and level costs", () => {
    const instructors = UPGRADE_DEFINITIONS.filter(
      (definition) => definition.category === "instructors",
    );
    expect(instructors.map((definition) => definition.id)).toEqual([
      "instructor-versatility",
      "technical-arena",
      "promiscuous-instructor",
      "extra-form",
      "tiamat-instructor",
      "pagosport",
      "divine-touch",
    ]);
    expect(instructors.every((definition) => definition.requiredHistoricMembers === 35)).toBe(true);
    expect(instructors.map((definition) =>
      Array.from({ length: definition.maxLevel }, (_, level) =>
        getUpgradeCost(definition, level)
      )
    )).toEqual([
      [2_000, 4_000],
      [2_000, 5_000, 10_000],
      [5_000],
      [10_000],
      [8_000, 13_000, 21_000, 34_000],
      [55_000, 89_000, 144_000],
      [1_000_000],
    ]);
  });

  it("applies Tocco DiGilo's exact +9999% teaching speed", () => {
    const levels = {
      ...createInitialUpgradeLevels(),
      "divine-touch": 1,
    };

    expect(getUpgradeEffectTotal(levels, "instructorTeachingSpeed")).toBe(99.99);
  });

  it("caps PagoSport's annual slots at two and makes level three free", () => {
    const levels = {
      ...createInitialUpgradeLevels(),
      "extra-form": 1,
      pagosport: 3,
    };

    expect(getUpgradeEffectTotal(levels, "annualFormCapacity")).toBe(3);
    expect(getAnnualFormTrainingLimit(levels)).toBe(4);
    expect(hasFreeFormTraining(levels)).toBe(true);
  });
});
