import type { TournamentResult } from "../types";
import type { MigratableState } from "./types";

function schoolWonOrdinaryTournament(result: TournamentResult): boolean {
  if (result.level === "school" || result.level === "chronicles") return false;
  const participantsById = new Map(
    result.participants.map((participant) => [participant.id, participant]),
  );
  return Boolean(
    participantsById.get(result.arenaRanking[0])?.ownedContactId ||
      participantsById.get(result.styleRanking[0])?.ownedContactId,
  );
}

export function migrateSecretLegendaryAppearanceState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 61) return state;

  const recentOrdinaryVictory = state.tournaments?.results?.some(
    schoolWonOrdinaryTournament,
  ) ?? false;
  return {
    ...state,
    version: 62,
    tournaments: state.tournaments
      ? {
          ...state.tournaments,
          ordinaryVictoryAchieved:
            state.tournaments.championsVictoryCurrentSchool === true ||
            recentOrdinaryVictory,
        }
      : state.tournaments,
  };
}
