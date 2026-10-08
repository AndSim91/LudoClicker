import type { MigratableState } from "./types";

/*
 * v106: Forme, Area Istruttore and Tornei open at 10 members with a new tutorial
 * (it replaces the one of the Istruttori discount). A save already past 10 members
 * (or past its first school) marks it as done, so it never plays late.
 */
export function migrateFormsTeachingTutorialState(state: MigratableState): MigratableState {
  if (state.version !== 105) return state;
  const tutorial = state.tutorial;
  const past = (state.school?.peakActiveMembers ?? 0) >= 10 || (state.network?.schoolCount ?? 0) > 0;
  return {
    ...state,
    version: 106,
    ...(tutorial && past && !tutorial.completedSceneIds.includes("forms-teaching")
      ? { tutorial: { ...tutorial, completedSceneIds: [...tutorial.completedSceneIds, "forms-teaching"] } }
      : {}),
  };
}
