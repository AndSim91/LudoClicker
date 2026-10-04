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

export function isSuperbaTournament(state: Pick<GameState, "network">): boolean {
  return state.network.superbaTournament === true;
}

/** Texts of the scene and of the message when the Reptile becomes the Superba. */
export const SUPERBA_COPY = {
  kicker: "Il Torneo Reptile si evolve",
  title: "Nasce il Torneo della Superba!",
  body: "Dalla prossima edizione avversari più forti e nuovi segreti da sbloccare.",
};

export function getReptileTournamentName(state: Pick<GameState, "network">): string {
  return isSuperbaTournament(state) ? "Torneo della Superba" : "Torneo Reptile";
}

/** Winning the Torneo della Superba reveals the secret Corso X, bought for 1 €. */
export function discoverCourseXFromSuperbaVictory(state: GameState, now: number): GameState {
  if (state.secretUpgradeDiscoveries.includes("project-x")) return state;
  return addMessage({
    ...state,
    secretUpgradeDiscoveries: [...state.secretUpgradeDiscoveries, "project-x"],
  }, now, "Percorso Segreto: Corso X", "Battuta la Superba, negli Upgrade compare Corso X. Costa 1 €. Sì, uno.", "positive", "focused", "progress");
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
  }, now, "La scuola organizza un torneo", `Arena e Stile al Nazionale aprono la strada: ora puoi organizzare il primo ${getReptileTournamentName(state)}, a coppie.`, "positive", "focused", "tournaments");
}
