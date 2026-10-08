import type { MigratableState } from "./types";

/*
 * v109 (08/10/2026): the «Rubrica vuota» reminder plays the first time the player
 * has nobody left to write to. Saves already past the start (10 members or a
 * school founded) know the Eventi well: it counts as seen.
 */
export function migrateOutOfContactsTutorialState(state: MigratableState): MigratableState {
  if (state.version !== 108) return state;
  const tutorial = state.tutorial;
  const past = (state.school?.peakActiveMembers ?? 0) >= 10 || (state.network?.schoolCount ?? 0) > 0;
  return {
    ...state,
    version: 109,
    ...(tutorial && past && !tutorial.completedSceneIds.includes("out-of-contacts")
      ? { tutorial: { ...tutorial, completedSceneIds: [...tutorial.completedSceneIds, "out-of-contacts"] } }
      : {}),
  };
}
