import type { TournamentDiscipline, TournamentResult } from "../types";
import type { MigratableState } from "./types";

function schoolWon(
  result: TournamentResult,
  discipline: TournamentDiscipline,
): boolean {
  if (result.level !== "champions") return false;
  const ranking = discipline === "arena" ? result.arenaRanking : result.styleRanking;
  const winner = result.participants.find((participant) => participant.id === ranking[0]);
  return Boolean(winner?.ownedContactId);
}

export function migrateChroniclesState(state: MigratableState): MigratableState {
  if (state.version !== 45) return state;
  const earnedKeys = (state.tournaments?.results ?? []).filter((result) =>
    schoolWon(result, "arena") && schoolWon(result, "style")
  ).length;
  return {
    ...state,
    version: 46,
    tournaments: state.tournaments
      ? {
          ...state.tournaments,
          chronicles: {
            unlocked: earnedKeys > 0,
            keys: earnedKeys,
          },
        }
      : state.tournaments,
  };
}
