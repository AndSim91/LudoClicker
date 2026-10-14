import { getWritingPower } from "../formulas";
import type { GameState } from "../types";
import type { MigratableState } from "./types";

/*
 * v116 (14/10/2026): the Reputation branch Email/Social becomes «Scrittura» and
 * gives +1 character per input per point instead of +20% (Andrea). The points
 * spent stay as they are (1 to 1); only the cached writing power is recomputed.
 */
export function migrateWritingReputationState(state: MigratableState): MigratableState {
  if (state.version !== 115) return state;
  const player = state.player as { writingPower?: number } | undefined;
  if (!player || !state.upgrades || !state.network) return { ...state, version: 116 };
  return {
    ...state,
    version: 116,
    player: { ...player, writingPower: getWritingPower(state as unknown as GameState) },
  } as MigratableState;
}
