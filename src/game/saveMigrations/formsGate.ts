import type { MigratableState } from "./types";

/*
 * v108 (08/10/2026): the Forme open at 10 members, but saves from before v106
 * kept them open from the first member (and v107 then opened Tornei too).
 * Below 10 members of peak both close again; in the first school the
 * Tornei tutorial goes back to waiting for its moment.
 */
export function migrateFormsGateState(state: MigratableState): MigratableState {
  if (state.version !== 107) return state;
  const unlocks = state.unlocks;
  const early = (state.school?.peakActiveMembers ?? 0) < 10;
  if (!unlocks || !early) return { ...state, version: 108 };
  const tutorial = state.tutorial;
  const founded = (state.network?.schoolCount ?? 0) > 0;
  return {
    ...state,
    version: 108,
    unlocks: { ...unlocks, forms: false, tournaments: false },
    ...(tutorial && !founded
      ? { tutorial: { ...tutorial, completedSceneIds: tutorial.completedSceneIds.filter((id) => id !== "tournaments-opening") } }
      : {}),
  };
}
