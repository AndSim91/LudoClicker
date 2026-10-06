import type { MigratableState } from "./types";

/*
 * v104: the tutorial of the swords menu plays at 10 iscritti. A save already
 * past them (or past its first school) marks it as done, so it never plays late.
 */
export function migrateSwordPurchaseTutorialState(state: MigratableState): MigratableState {
  if (state.version !== 103) return state;
  const tutorial = state.tutorial;
  const past = (state.school?.peakActiveMembers ?? 0) >= 10 || (state.network?.schoolCount ?? 0) > 0;
  return {
    ...state,
    version: 104,
    ...(tutorial && past && !tutorial.completedSceneIds.includes("sword-purchase")
      ? { tutorial: { ...tutorial, completedSceneIds: [...tutorial.completedSceneIds, "sword-purchase"] } }
      : {}),
  };
}
