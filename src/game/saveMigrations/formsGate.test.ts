import { expect, it } from "vitest";
import { migrateFormsGateState } from "./formsGate";
import type { MigratableState } from "./types";

const save = (peakActiveMembers: number, schoolCount = 0) => ({
  version: 107,
  school: { peakActiveMembers },
  network: { schoolCount },
  unlocks: { upgrades: true, collaborators: true, social: false, forms: true, tournaments: true, gadget: false },
  tutorial: { completedSceneIds: ["tournaments-opening"], skippedSceneIds: [] },
}) as unknown as MigratableState;

it("closes Forme and Tornei below 10 members of peak", () => {
  const early = migrateFormsGateState(save(2));
  expect(early.version).toBe(108);
  expect(early.unlocks).toMatchObject({ forms: false, tournaments: false });
  expect(early.tutorial?.completedSceneIds).not.toContain("tournaments-opening");

  expect(migrateFormsGateState(save(2, 1)).tutorial?.completedSceneIds).toContain("tournaments-opening");
  expect(migrateFormsGateState(save(10)).unlocks).toMatchObject({ forms: true, tournaments: true });
});
