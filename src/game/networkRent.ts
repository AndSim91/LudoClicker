import { GAME_CONFIG } from "./config";
import { getMonthlyMemberFees } from "./membershipEconomy";
import type { FoundedSchool, GameState } from "./types";

/*
 * Rete dell'Ordine: every school left behind with the prestige keeps paying a
 * fixed monthly rent, set at the moment of the foundation. The share of its
 * fees starts at 25% and grows by 25 points for the Champion's Arena and 25 for
 * the Reptile (or the Superba it became), once each: at most 75%. The national
 * title is the requirement of the prestige, so it adds nothing.
 */

export interface FoundationRentPreview {
  memberFees: number;
  championsWin: boolean;
  reptileWin?: FoundedSchool["reptileWin"];
  share: number;
  rent: number;
}

function getReptileWin(state: GameState): FoundedSchool["reptileWin"] {
  const wins = state.tournaments.reptile.hall.filter((entry) => entry.schoolName === state.school.name);
  if (wins.length === 0) return undefined;
  return wins.some((entry) => entry.superba) ? "superba" : "reptile";
}

export function getFoundationRentPreview(state: GameState): FoundationRentPreview {
  const championsWin = state.tournaments.championsVictoryCurrentSchool;
  const reptileWin = getReptileWin(state);
  const share = GAME_CONFIG.networkRentShare +
    ((championsWin ? 1 : 0) + (reptileWin ? 1 : 0)) * GAME_CONFIG.networkRentBonusPerTournament;
  const memberFees = getMonthlyMemberFees(state);
  return { memberFees, championsWin, reptileWin, share, rent: Math.round(memberFees * share) };
}

export function getMonthlyNetworkRent(state: Pick<GameState, "network">): number {
  return state.network.schools.reduce((total, school) => total + (school.monthlyRent ?? 0), 0);
}
