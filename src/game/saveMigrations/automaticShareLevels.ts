import type { MigratableState } from "./types";

/*
 * v89, effort bars of the «Assegnazione automatica» (4.7): the shares were
 * free weights (steps of 5); now 20 is one notch and 100 the full bar. The
 * largest share becomes 100 and the others keep their proportion, so nobody's
 * sector changes.
 */
export function migrateAutomaticShareLevelsState(state: MigratableState): MigratableState {
  if (state.version !== 88) return state;
  const management = state.collaboratorManagement;
  const shares = management?.automaticShares;
  const largest = shares ? Math.max(0, ...Object.values(shares).map((share) => share ?? 0)) : 0;
  if (!management || !shares || largest <= 0) return { ...state, version: 89 };
  return {
    ...state,
    version: 89,
    collaboratorManagement: {
      ...management,
      automaticShares: Object.fromEntries(
        Object.entries(shares).map(([role, share]) => [role, Math.round((share ?? 0) / largest * 100)]),
      ),
    },
  };
}
