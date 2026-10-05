import { forgetLegendaryProgress } from "../schoolProgressionFlow";
import type { MigratableState } from "./types";

/*
 * v97–v98: a new school now starts every Leggendario from zero. Saves that
 * already founded a school forget what the Leggendari of earlier schools had
 * earned; those met in the current school (still among its contacts) keep it.
 * v98 runs it again for saves that reached v97 while Andrea Simonazzi was kept
 * (it is idempotent for everyone else).
 */
export function migrateLegendaryResetState(state: MigratableState): MigratableState {
  if (state.version !== 96 && state.version !== 97) return state;
  const legendary = state.legendaryCollaborators;
  if (!(state.network?.schoolCount ?? 0) || !legendary?.retainedProgress) {
    return { ...state, version: 98 };
  }
  const metHere = new Set<string | undefined>(
    (state.contacts ?? []).map((contact) => contact.specialProfileId),
  );
  const retainedProgress = Object.fromEntries(
    Object.entries(legendary.retainedProgress).map(([id, retained]) =>
      [id, retained && !metHere.has(id) ? forgetLegendaryProgress(retained) : retained]),
  ) as typeof legendary.retainedProgress;
  return { ...state, version: 98, legendaryCollaborators: { ...legendary, retainedProgress } };
}
