import { GAME_CONFIG } from "../config";
import { getReptileFameLevel } from "../reptilePreparation";
import type { MigratableState } from "./types";

/*
 * v96: the Superba now starts at Reptile fame level 1. Saves already there
 * become the Superba at once; the scene plays on load as the announcement.
 */
export function migrateSuperbaLevelOneState(state: MigratableState): MigratableState {
  if (state.version !== 95) return state;
  const fameXp = state.tournaments?.reptile?.fameXp ?? 0;
  const reached = getReptileFameLevel(fameXp) >= GAME_CONFIG.superbaReptileFameLevel;
  if (!reached || !state.network || state.network.superbaTournament) return { ...state, version: 96 };
  return { ...state, version: 96, network: { ...state.network, superbaTournament: true } };
}
