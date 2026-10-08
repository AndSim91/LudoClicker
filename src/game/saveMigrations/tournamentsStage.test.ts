import { expect, it } from "vitest";
import { migrateTournamentsStageState } from "./tournamentsStage";
import type { MigratableState } from "./types";

const save = (fame: number, forms: boolean, results: { level: string }[] = []) => ({
  version: 106,
  school: { fame },
  network: { schoolCount: 0 },
  unlocks: { upgrades: true, collaborators: true, social: false, forms, gadget: false },
  tournaments: { results },
  tutorial: { completedSceneIds: [], skippedSceneIds: [] },
  moments: { seen: [], queue: [] },
}) as unknown as MigratableState;

it("keeps Tornei open where the old rule had opened it and marks what is already behind", () => {
  const open = migrateTournamentsStageState(save(12, true));
  expect(open.version).toBe(107);
  expect(open.unlocks?.tournaments).toBe(true);
  expect(open.tutorial?.completedSceneIds).toContain("tournaments-opening");
  expect(open.moments?.seen).not.toContain("school-tournament");

  const played = migrateTournamentsStageState(save(30, true, [{ level: "school" }]));
  expect(played.moments?.seen).toContain("school-tournament");

  const early = migrateTournamentsStageState(save(4, false));
  expect(early.unlocks?.tournaments).toBe(false);
  expect(early.tutorial?.completedSceneIds).not.toContain("tournaments-opening");
});
