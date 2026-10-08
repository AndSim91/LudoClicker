import { expect, it } from "vitest";
import { migrateFormsTeachingTutorialState } from "./formsTeachingTutorial";
import type { MigratableState } from "./types";

const save = (peak: number, schoolCount = 0) => ({
  version: 105,
  school: { peakActiveMembers: peak },
  network: { schoolCount },
  tutorial: { completedSceneIds: [], skippedSceneIds: [] },
}) as unknown as MigratableState;

it("marks the Forme tutorial done only on saves already past 10 iscritti or a first school", () => {
  expect(migrateFormsTeachingTutorialState(save(10)).tutorial?.completedSceneIds).toContain("forms-teaching");
  expect(migrateFormsTeachingTutorialState(save(3, 1)).tutorial?.completedSceneIds).toContain("forms-teaching");
  expect(migrateFormsTeachingTutorialState(save(9)).tutorial?.completedSceneIds).not.toContain("forms-teaching");
  expect(migrateFormsTeachingTutorialState(save(9)).version).toBe(106);
});
