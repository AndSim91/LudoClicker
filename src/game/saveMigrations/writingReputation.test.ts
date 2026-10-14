import { expect, it } from "vitest";
import { migrateWritingReputationState } from "./writingReputation";
import type { MigratableState } from "./types";

it("recomputes the writing power for «Scrittura»: +1 a point, points kept 1 to 1 (v116)", () => {
  const save = {
    version: 115,
    player: { writingPower: 1.8 },
    upgrades: { "comfortable-keyboard": 5 },
    network: { reputationUpgrades: { writing: 4 } },
  } as unknown as MigratableState;
  const migrated = migrateWritingReputationState(save) as unknown as {
    version: number;
    player: { writingPower: number };
    network: { reputationUpgrades: { writing: number } };
  };
  expect(migrated.version).toBe(116);
  // 1 + Tastiera comoda al massimo (+1) + 4 punti Scrittura.
  expect(migrated.player.writingPower).toBe(6);
  expect(migrated.network.reputationUpgrades.writing).toBe(4);
});
