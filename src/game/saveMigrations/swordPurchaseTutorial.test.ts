import { expect, it } from "vitest";
import { migrateSwordPurchaseTutorialState } from "./swordPurchaseTutorial";
import type { MigratableState } from "./types";

const save = (peak: number) => ({
  version: 103,
  school: { peakActiveMembers: peak },
  tutorial: { completedSceneIds: [], skippedSceneIds: [] },
}) as unknown as MigratableState;

it("marks the swords tutorial done only on saves already past 10 iscritti", () => {
  expect(migrateSwordPurchaseTutorialState(save(12)).tutorial?.completedSceneIds).toContain("sword-purchase");
  expect(migrateSwordPurchaseTutorialState(save(4)).tutorial?.completedSceneIds).not.toContain("sword-purchase");
  expect(migrateSwordPurchaseTutorialState(save(4)).version).toBe(104);
});
