import type { MigratableState } from "./types";

/*
 * v95: the birth of the Torneo della Superba becomes a scene. Saves where the
 * Reptile is already the Superba mark it as seen, so it never plays late.
 */
export function migrateSuperbaMomentState(state: MigratableState): MigratableState {
  if (state.version !== 94) return state;
  const moments = state.moments;
  if (!moments || !state.network?.superbaTournament || moments.seen.includes("superba")) {
    return { ...state, version: 95 };
  }
  return { ...state, version: 95, moments: { ...moments, seen: [...moments.seen, "superba"] } };
}
