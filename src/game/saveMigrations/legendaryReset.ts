import { forgetLegendaryProgress } from "../schoolProgressionFlow";
import type { MigratableState } from "./types";

/*
 * v97: a new school now starts every Leggendario from zero. Saves that already
 * founded a school forget what the Leggendari of earlier schools had earned;
 * those met in the current school (still among its contacts) and Andrea
 * Simonazzi keep it.
 */
export function migrateLegendaryResetState(state: MigratableState): MigratableState {
  if (state.version !== 96) return state;
  const legendary = state.legendaryCollaborators;
  if (!(state.network?.schoolCount ?? 0) || !legendary?.retainedProgress) {
    return { ...state, version: 97 };
  }
  // Andrea Simonazzi keeps everything from school to school.
  const metHere = new Set<string | undefined>([
    ...(state.contacts ?? []).map((contact) => contact.specialProfileId),
    "andrea-simonazzi",
  ]);
  const retainedProgress = Object.fromEntries(
    Object.entries(legendary.retainedProgress).map(([id, retained]) =>
      [id, retained && !metHere.has(id) ? forgetLegendaryProgress(retained) : retained]),
  ) as typeof legendary.retainedProgress;
  return { ...state, version: 97, legendaryCollaborators: { ...legendary, retainedProgress } };
}
