import type { TournamentCircuitLevel } from "../../content/tournamentSchools";
import { applySecretLegendaryDifficultyChange } from "./secretLegendaryDifficulty";
import type { MigratableState } from "./types";

const VERSION_69_CIRCUIT_BOOST_REMOVAL: Record<TournamentCircuitLevel, number> = {
  academy: 125 / 150,
  national: 150 / 225,
  champions: 200 / 300,
};

export function migrateSecretLegendaryCircuitBoostRemovalState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 68) return state;

  return {
    ...applySecretLegendaryDifficultyChange(
      state,
      VERSION_69_CIRCUIT_BOOST_REMOVAL,
    ),
    version: 69,
  };
}
