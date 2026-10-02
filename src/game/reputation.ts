import { GAME_CONFIG } from "./config";
import type { FoundedSchool, GameState } from "./types";

/*
 * Reputazione di rete (6.19): the only value that travels from a school to the
 * next one. The prestige earns half of √(Fama / 100) points, +1 each for the
 * Champion's Arena, the Reptile (or the Superba it became) and the Chronicles
 * won by the school left behind. Points are spent at the foundation, for good:
 * - six permanent upgrades, +10% of their base value per point, up to 50 points;
 * - the network rent, which is consumed: each point locks 10% of the rent value
 *   of the school being left (members × base fee × 10%) as a fixed monthly
 *   rent. The points do not stay as levels, so the next school starts from 0%.
 */

export const REPUTATION_UPGRADE_IDS = [
  "writing",
  "trialBooking",
  "enrollment",
  "membershipFees",
  "training",
  "athleticPreparation",
] as const;

export type ReputationUpgradeId = (typeof REPUTATION_UPGRADE_IDS)[number];
export type ReputationUpgradeLevels = Partial<Record<ReputationUpgradeId, number>>;

export const REPUTATION_UPGRADES: Record<ReputationUpgradeId, { label: string; description: string }> = {
  writing: { label: "Compilazione email", description: "caratteri per input" },
  trialBooking: { label: "Lezioni di prova", description: "probabilità base che un'email prenoti una prova" },
  enrollment: { label: "Iscrizioni", description: "probabilità base di iscrizione dopo la prova" },
  membershipFees: { label: "Quote mensili", description: "quote degli iscritti" },
  training: { label: "Formazione allievi", description: "velocità dei corsi degli allievi" },
  athleticPreparation: { label: "Capacità di miglioramento", description: "miglioramenti della Preparazione atletica" },
};

export interface ReputationSpending {
  upgrades: ReputationUpgradeLevels;
  rent: number;
}

export const NO_REPUTATION_SPENDING: ReputationSpending = { upgrades: {}, rent: 0 };

export function getReputationLevel(
  state: Pick<GameState, "network">,
  id: ReputationUpgradeId,
): number {
  return state.network.reputationUpgrades?.[id] ?? 0;
}

export function getReputationMultiplier(
  state: Pick<GameState, "network">,
  id: ReputationUpgradeId,
): number {
  return 1 + getReputationLevel(state, id) * GAME_CONFIG.reputationStep;
}

function getReptileWin(state: GameState): FoundedSchool["reptileWin"] {
  const wins = state.tournaments.reptile.hall.filter((entry) => entry.schoolName === state.school.name);
  if (wins.length === 0) return undefined;
  return wins.some((entry) => entry.superba) ? "superba" : "reptile";
}

export interface PrestigeReputationPreview {
  famePoints: number;
  championsWin: boolean;
  reptileWin?: FoundedSchool["reptileWin"];
  chroniclesWin: boolean;
  /** Points earned by founding now. */
  points: number;
  /** Rent locked by each point spent on the network rent at this foundation. */
  rentPerPoint: number;
}

export function getPrestigeReputationPreview(state: GameState): PrestigeReputationPreview {
  const championsWin = state.tournaments.championsVictoryCurrentSchool;
  const reptileWin = getReptileWin(state);
  const chroniclesWin = state.tournaments.chroniclesVictoryCurrentSchool === true;
  const famePoints = Math.floor(Math.sqrt(Math.max(0, state.school.fame) / 100) / 2);
  const rentValue = Math.max(0, state.school.activeMembers) *
    GAME_CONFIG.monthlyMemberFee * GAME_CONFIG.networkRentValueShare;
  return {
    famePoints,
    championsWin,
    reptileWin,
    chroniclesWin,
    points: famePoints + [championsWin, reptileWin, chroniclesWin].filter(Boolean).length,
    rentPerPoint: rentValue * GAME_CONFIG.reputationStep,
  };
}

export function getSpentReputation(spending: ReputationSpending): number {
  return REPUTATION_UPGRADE_IDS.reduce(
    (total, id) => total + (spending.upgrades[id] ?? 0),
    spending.rent,
  );
}

/** Whole points, no more than the available ones, permanent upgrades within their cap. */
export function isValidReputationSpending(
  state: Pick<GameState, "network">,
  spending: ReputationSpending,
  available: number,
): boolean {
  const amounts = [spending.rent, ...REPUTATION_UPGRADE_IDS.map((id) => spending.upgrades[id] ?? 0)];
  if (amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0)) return false;
  if (REPUTATION_UPGRADE_IDS.some((id) =>
    getReputationLevel(state, id) + (spending.upgrades[id] ?? 0) > GAME_CONFIG.reputationUpgradeMaxLevel
  )) return false;
  return getSpentReputation(spending) <= available;
}

export function getMonthlyNetworkRent(state: Pick<GameState, "network">): number {
  return state.network.schools.reduce((total, school) => total + (school.monthlyRent ?? 0), 0);
}
