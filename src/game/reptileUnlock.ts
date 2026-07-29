import { addMessage } from "./stateUpdates";
import type { GameState, TournamentResult } from "./types";

export function didWinBothNationalDisciplines(result: TournamentResult): boolean {
  if (result.level !== "national") return false;
  const participants = new Map(result.participants.map((entry) => [entry.id, entry]));
  return Boolean(
    participants.get(result.arenaRanking[0])?.ownedContactId &&
      participants.get(result.styleRanking[0])?.ownedContactId,
  );
}

export function unlockReptileFromTournamentResult(
  state: GameState,
  result: TournamentResult,
  now: number,
): GameState {
  if (state.tournaments.reptile.unlocked || !didWinBothNationalDisciplines(result)) return state;
  return addMessage({
    ...state,
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, unlocked: true },
    },
  }, now, "Torneo Reptile sbloccato", "La vittoria nazionale in Arena e Stile permette alla scuola di organizzare il suo primo torneo Open a coppie.", "positive", "focused", "tournaments");
}
