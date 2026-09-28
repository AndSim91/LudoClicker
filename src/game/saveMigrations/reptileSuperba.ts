import { GAME_CONFIG } from "../config";
import { getReptileFameLevel } from "../reptilePreparation";
import type { MigratableState } from "./types";

/** Reptiles that already reached the Superba fame level become the Torneo della Superba. */
export function migrateReptileSuperbaState(state: MigratableState): MigratableState {
  if (state.version !== 83) return state;
  const fameXp = state.tournaments?.reptile?.fameXp ?? 0;
  const superba = getReptileFameLevel(fameXp) >= GAME_CONFIG.superbaReptileFameLevel;
  return {
    ...state,
    version: 84,
    network: state.network && superba
      ? { ...state.network, superbaTournament: true }
      : state.network,
  };
}
