import type { TournamentCircuitLevel } from "../../content/tournamentSchools";
import { applySecretLegendaryDifficultyChange } from "./secretLegendaryDifficulty";
import type { MigratableState } from "./types";

const VERSION_67_DIFFICULTY_INCREASES: Record<TournamentCircuitLevel, number> = {
  academy: 1,
  national: 225 / 200,
  champions: 300 / 250,
};

export function migrateTournamentStandardDifficultyState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 66) return state;

  return {
    ...applySecretLegendaryDifficultyChange(
      state,
      VERSION_67_DIFFICULTY_INCREASES,
    ),
    version: 67,
  };
}
