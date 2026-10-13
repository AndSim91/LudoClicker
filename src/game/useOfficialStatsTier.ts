import { getOfficialStatsVisibilityTier } from "../content/upgrades";
import { useGameSelector } from "./GameStateContext";
import type { GameState } from "./types";

const selectTier = (state: GameState) => getOfficialStatsVisibilityTier(state.upgrades);
// ponytail: outside a provider (isolated tests) everything shows, as before.
const showAll = () => 2;

/** Occhio del Maestro level, for components that do not receive the state. */
export function useOfficialStatsTier(): number {
  return useGameSelector(selectTier, undefined, Object.is, showAll);
}
