import {
  buildTournamentHall,
  compactDetailedTournamentResults,
} from "../tournamentHistory";
import type { GameState } from "../types";
import type { MigratableState } from "./types";

const SOCIAL_CONTENT_SUBJECT = "Contenuti Social pubblicati";

export function migrateLeanHistoryState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 79) return state;

  const results = state.tournaments?.results ?? [];
  const tournaments = state.tournaments
    ? {
        ...state.tournaments,
        results: compactDetailedTournamentResults(results),
        hall: buildTournamentHall(results),
      }
    : state.tournaments;

  return {
    ...state,
    version: 80,
    messages: (state.messages ?? []).filter(
      (message) => message.subject !== SOCIAL_CONTENT_SUBJECT,
    ),
    tournaments: tournaments as GameState["tournaments"] | undefined,
  };
}
