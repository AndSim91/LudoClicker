import { describe, expect, it } from "vitest";
import {
  createInitialUpgradeLevels,
  getUpgradeEffectTotal,
} from "./upgrades";
import type { UpgradeId } from "../game/types";

function maxedUpgrade(id: UpgradeId) {
  return { ...createInitialUpgradeLevels(), [id]: 5 };
}

describe("speed upgrade effects", () => {
  it.each([
    ["comfortable-keyboard", "writingPower", 1],
    ["quick-phrases", "writingPower", 2],
    ["automatic-signature", "automationMultiplier", 0.5],
    ["automatic-signature", "writingPower", 1],
    ["smart-fields", "writingPower", 3],
    ["instant-review", "automationMultiplier", 0.5],
    ["instant-review", "writingPower", 3],
    ["mail-merge", "automationMultiplier", 0.5],
    ["mail-merge", "writingPower", 4],
  ] as const)("applies the maximum effect of %s to %s", (id, effect, expected) => {
    expect(getUpgradeEffectTotal(maxedUpgrade(id), effect)).toBe(expected);
  });
});
