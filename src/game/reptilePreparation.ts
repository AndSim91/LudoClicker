import { getCollaboratorProductivity } from "../content/forms";
import { getCalendarMonth } from "./calendar";
import { isPrimarySectorIdle } from "./collaboratorFallback";
import { GAME_CONFIG } from "./config";
import {
  REPTILE_ROLE_BY_SECTOR,
  REPTILE_SECTORS,
  getReptileSectorForRole,
  isReptileBarOpen,
} from "./reptileSectors";
import type {
  GameState,
  ReptileActiveEdition,
  ReptileBar,
  ReptileSector,
} from "./types";

export { REPTILE_SECTORS, REPTILE_SECTOR_LABELS } from "./reptileSectors";

/*
 * Reptile preparation (rifatto, 04/10): five bars, one per sector, filled with
 * collaborator power × game months. Each sector gives half its power to its
 * bar (all of it when idle); people without a sector help the bar furthest
 * behind at half value. A sector with nobody assigned does not move. The
 * faster a bar fills, the better that sector's quality.
 */

/** Work per bar with 16 teams, in collaborator power × game months. */
export const REPTILE_BASE_LOADS: Record<ReptileSector, number> = {
  social: 24,
  events: 16,
  equipment: 10,
  instructors: 16,
  gadget: 8,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getReptileFameLevel(fameXp: number): number {
  return Math.min(5, Math.floor(clamp(fameXp, 0, 3_000) / 500));
}

export function getReptileTeamCount(fameXp: number): number {
  return 16 * 2 ** getReptileFameLevel(fameXp);
}

export function getReptileTeamLoadMultiplier(teamCount: number): number {
  return 1 + Math.max(0, Math.log2(Math.max(16, teamCount) / 16)) * 0.5;
}

export function getReptileQualityLabel(quality: number): string {
  if (quality < 20) return "Disastroso";
  if (quality < 40) return "Insufficiente";
  if (quality < 60) return "Adeguato";
  if (quality < 80) return "Buono";
  return "Eccellente";
}

/** Sectors with a bar: Gadget only once the Gadget area is open. */
export function getReptilePreparationSectors(state: Pick<GameState, "unlocks">): ReptileSector[] {
  return REPTILE_SECTORS.filter((sector) => sector !== "gadget" || state.unlocks.gadget);
}

/** 100 when the bar filled within three game months, 50 in six, 25 in twelve. */
export function getReptileBarQuality(bar: ReptileBar): number {
  if (bar.completedAfterMs === undefined) return 0;
  const excellentMs = GAME_CONFIG.reptileExcellentMonths * GAME_CONFIG.gameMonthMs;
  return Math.round(100 * Math.min(1, excellentMs / Math.max(1, bar.completedAfterMs)));
}

export function getReptileBaseResa(edition: ReptileActiveEdition): number {
  const bars = Object.values(edition.bars);
  if (bars.length === 0) return 0;
  return bars.reduce((total, bar) => total + getReptileBarQuality(bar), 0) / bars.length;
}

export function isReptilePreparationComplete(edition: ReptileActiveEdition): boolean {
  return Object.values(edition.bars).every((bar) => bar.completedAfterMs !== undefined);
}

export function canOrganizeReptile(state: GameState): boolean {
  const reptile = state.tournaments.reptile;
  return reptile.unlocked && !reptile.activeEdition &&
    state.school.euros >= GAME_CONFIG.reptileVenueCost;
}

export function organizeReptile(state: GameState, now: number): GameState {
  if (!canOrganizeReptile(state)) return state;
  const teamCount = getReptileTeamCount(state.tournaments.reptile.fameXp);
  const loadMultiplier = getReptileTeamLoadMultiplier(teamCount);
  const bars = Object.fromEntries(getReptilePreparationSectors(state).map((sector) => [
    sector,
    { progress: 0, required: REPTILE_BASE_LOADS[sector] * loadMultiplier },
  ])) as ReptileActiveEdition["bars"];
  const activeEdition: ReptileActiveEdition = {
    id: `reptile-${state.school.currentMonth}-${now}`,
    organizedAt: now,
    organizedMonth: state.school.currentMonth,
    teamCount,
    elapsedMs: 0,
    lastProgressAt: now,
    bars,
    minigame: { status: "ready", score: 0, available: 0, bonusPercent: 0 },
  };
  return {
    ...state,
    school: { ...state.school, euros: state.school.euros - GAME_CONFIG.reptileVenueCost },
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, activeEdition },
    },
  };
}

export function cancelReptile(state: GameState): GameState {
  if (!state.tournaments.reptile.activeEdition) return state;
  const refund = Math.round(GAME_CONFIG.reptileVenueCost * GAME_CONFIG.reptileCancelRefundShare);
  return {
    ...state,
    school: { ...state.school, euros: state.school.euros + refund },
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, activeEdition: undefined },
    },
  };
}

export interface ReptileBarRate {
  /** Power per game month going into the bar. */
  rate: number;
  /** Collaborators assigned to the sector. */
  assigned: number;
  /** Of them, idle and giving everything. */
  idle: number;
  /** Collaborators without a sector helping this bar. */
  helpers: number;
}

/** Live power going into each open bar. */
export function getReptileBarRates(state: GameState): Partial<Record<ReptileSector, ReptileBarRate>> {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition) return {};
  const rates: Partial<Record<ReptileSector, ReptileBarRate>> = {};
  for (const sector of Object.keys(edition.bars) as ReptileSector[]) {
    if (isReptileBarOpen(state, sector)) rates[sector] = { rate: 0, assigned: 0, idle: 0, helpers: 0 };
  }
  let unassignedPower = 0;
  let unassignedCount = 0;
  for (const collaborator of state.collaborators) {
    if (!collaborator.assignment) {
      unassignedPower += getCollaboratorProductivity(collaborator, null) * GAME_CONFIG.reptileUnassignedShare;
      unassignedCount += 1;
      continue;
    }
    const sector = getReptileSectorForRole(collaborator.assignment);
    const entry = sector ? rates[sector] : undefined;
    if (!sector || !entry) continue;
    const idle = isPrimarySectorIdle(state, collaborator);
    entry.assigned += 1;
    if (idle) entry.idle += 1;
    entry.rate += getCollaboratorProductivity(collaborator, REPTILE_ROLE_BY_SECTOR[sector]) *
      (idle ? 1 : GAME_CONFIG.reptilePreparationShare);
  }
  if (unassignedPower > 0) {
    const behind = (Object.keys(rates) as ReptileSector[])
      .filter((sector) => rates[sector]!.assigned > 0)
      .sort((left, right) => {
        const a = edition.bars[left]!;
        const b = edition.bars[right]!;
        return a.progress / a.required - b.progress / b.required;
      })[0];
    if (behind) {
      rates[behind]!.rate += unassignedPower;
      rates[behind]!.helpers = unassignedCount;
    }
  }
  return rates;
}

/** Game months still needed by a bar at the current pace (Infinity if stuck). */
export function getReptileBarMonthsLeft(bar: ReptileBar, rate: number | undefined): number {
  if (bar.completedAfterMs !== undefined) return 0;
  if (!rate || rate <= 0) return Infinity;
  return Math.max(0, bar.required - bar.progress) / rate;
}

export function processReptilePreparation(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition) return state;
  const elapsed = Math.max(0, now - edition.lastProgressAt);
  if (elapsed <= 0) return state;
  // A running «giornata degli imprevisti» pauses the game: no progress meanwhile.
  const rates = getReptileBarRates(state);
  const months = elapsed / GAME_CONFIG.gameMonthMs;
  const bars = { ...edition.bars };
  for (const sector of Object.keys(rates) as ReptileSector[]) {
    const bar = bars[sector]!;
    const rate = rates[sector]!.rate;
    if (rate <= 0) continue;
    const progress = bar.progress + rate * months;
    if (progress < bar.required) {
      bars[sector] = { ...bar, progress };
      continue;
    }
    const neededMs = ((bar.required - bar.progress) / rate) * GAME_CONFIG.gameMonthMs;
    bars[sector] = {
      ...bar,
      progress: bar.required,
      completedAfterMs: Math.max(1, Math.round(edition.elapsedMs + neededMs)),
    };
  }
  return updateEdition(state, {
    ...edition,
    bars,
    elapsedMs: edition.elapsedMs + elapsed,
    lastProgressAt: now,
  });
}

export function calculateReptileMinigameBonus(score: number, available: number): number {
  if (!(available > 0) || !(score > 0)) return 0;
  const share = Math.min(1, score / (GAME_CONFIG.reptileMinigameFullScoreShare * available));
  return Math.round(GAME_CONFIG.reptileMinigameMaxBonusPercent * share);
}

export function startReptileMinigame(state: GameState, now: number): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.minigame.status !== "ready") return state;
  return updateEdition(state, {
    ...edition,
    minigame: { ...edition.minigame, status: "running", startedAt: now },
  });
}

/** The only attempt ends: the score and the perfect day's score come from the board. */
export function completeReptileMinigame(
  state: GameState,
  score: number,
  available: number,
): GameState {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition || edition.minigame.status !== "running") return state;
  const safeAvailable = Number.isFinite(available) ? clamp(available, 0, 5_000) : 0;
  // Nobody beats the perfect day.
  const safeScore = Number.isFinite(score) ? clamp(score, 0, safeAvailable) : 0;
  return updateEdition(state, {
    ...edition,
    minigame: {
      ...edition.minigame,
      status: "completed",
      score: safeScore,
      available: safeAvailable,
      bonusPercent: calculateReptileMinigameBonus(safeScore, safeAvailable),
    },
  });
}

export function isJuly(currentMonth: number): boolean {
  return getCalendarMonth(currentMonth) === 7;
}

function updateEdition(state: GameState, activeEdition: ReptileActiveEdition): GameState {
  return {
    ...state,
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, activeEdition },
    },
  };
}

export interface ReptileBarOutlook {
  sector: ReptileSector;
  bar: ReptileBar;
  share: number;
  rate: ReptileBarRate;
  monthsLeft: number;
  /** Quality now if complete, otherwise at the current pace (0 if stuck). */
  quality: number;
  stuck: boolean;
}

export interface ReptileOutlook {
  bars: ReptileBarOutlook[];
  complete: boolean;
  /** Absolute month when the last bar fills (undefined if a bar is stuck). */
  readyMonth?: number;
  /** Absolute month of the tournament at the current pace. */
  tournamentMonth?: number;
  projectedResa: number;
}

/** First July at or after a month, skipping one that already had its Reptile. */
export function getNextReptileJuly(month: number, lastTournamentMonth?: number): number {
  let july = month + ((7 - getCalendarMonth(month) + 12) % 12);
  if (july === lastTournamentMonth) july += 12;
  return july;
}

export function getReptileOutlook(state: GameState): ReptileOutlook | undefined {
  const edition = state.tournaments.reptile.activeEdition;
  if (!edition) return undefined;
  const rates = getReptileBarRates(state);
  const elapsedMonths = edition.elapsedMs / GAME_CONFIG.gameMonthMs;
  const bars = (Object.entries(edition.bars) as [ReptileSector, ReptileBar][]).map(([sector, bar]) => {
    const rate = rates[sector] ?? { rate: 0, assigned: 0, idle: 0, helpers: 0 };
    const monthsLeft = getReptileBarMonthsLeft(bar, rate.rate);
    const quality = bar.completedAfterMs !== undefined
      ? getReptileBarQuality(bar)
      : Number.isFinite(monthsLeft)
        ? Math.round(100 * Math.min(1, GAME_CONFIG.reptileExcellentMonths / Math.max(0.001, elapsedMonths + monthsLeft)))
        : 0;
    return {
      sector,
      bar,
      share: Math.min(1, bar.progress / bar.required),
      rate,
      monthsLeft,
      quality,
      stuck: !Number.isFinite(monthsLeft),
    };
  });
  const complete = bars.every((entry) => entry.bar.completedAfterMs !== undefined);
  const slowest = Math.max(0, ...bars.map((entry) => entry.monthsLeft));
  const readyMonth = Number.isFinite(slowest)
    ? state.school.currentMonth + Math.ceil(slowest)
    : undefined;
  return {
    bars,
    complete,
    readyMonth,
    tournamentMonth: readyMonth === undefined
      ? undefined
      : getNextReptileJuly(readyMonth, state.tournaments.reptile.lastTournamentMonth),
    projectedResa: bars.length === 0
      ? 0
      : Math.round(bars.reduce((total, entry) => total + entry.quality, 0) / bars.length),
  };
}
