import type { CareerStatistics, GameState } from "./types";

/*
 * Career counters (4.4): cumulative values the achievements need and the game
 * did not keep across the prestige. They live in `statistics`, which every new
 * school inherits, so they cover the whole save.
 */

export function createInitialCareerStatistics(): CareerStatistics {
  return {
    perfectPhrases: 0,
    agonistCourses: 0,
    nationalTitles: 0,
    championsWins: 0,
    reptileWins: 0,
    chroniclesWins: 0,
    reputationEarned: 0,
    gadgetsSold: 0,
    largestYearlyDeparture: 0,
    maxRentPoints: 0,
  };
}

export function getCareer(state: Pick<GameState, "statistics">): CareerStatistics {
  return state.statistics.career ?? createInitialCareerStatistics();
}

/** Gadget units sold by the current school (the gadgets restart with each school). */
export function getSchoolGadgetsSold(state: Pick<GameState, "gadgets">): number {
  return Object.values(state.gadgets.products).reduce((total, product) =>
    total + Object.values(product.rarities).reduce((sum, rarity) => sum + rarity.unitsSold, 0), 0);
}

/** Frasi perfette of the whole save: earlier schools plus the current one. */
export function getCareerPerfectPhrases(state: Pick<GameState, "statistics" | "player">): number {
  return getCareer(state).perfectPhrases + (state.player.perfectPhrases ?? 0);
}

/** Gadget units of the whole save: earlier schools plus the current one. */
export function getCareerGadgetsSold(state: Pick<GameState, "statistics" | "gadgets">): number {
  return getCareer(state).gadgetsSold + getSchoolGadgetsSold(state);
}

/** Adds to the counters; zero or negative additions leave the state untouched. */
export function addCareer(
  state: GameState,
  added: Partial<Record<keyof CareerStatistics, number>>,
): GameState {
  const entries = Object.entries(added).filter(([, value]) => (value ?? 0) > 0);
  if (entries.length === 0) return state;
  const career = { ...getCareer(state) };
  for (const [key, value] of entries) {
    const field = key as keyof CareerStatistics;
    career[field] = (career[field] ?? 0) + (value ?? 0);
  }
  return { ...state, statistics: { ...state.statistics, career } };
}

/** Raises record-style counters (largest, maximum) and lowers `earliestFoundationYear`. */
export function recordCareer(
  state: GameState,
  record: { largestYearlyDeparture?: number; maxRentPoints?: number; earliestFoundationYear?: number },
): GameState {
  const current = getCareer(state);
  const career: CareerStatistics = {
    ...current,
    largestYearlyDeparture: Math.max(current.largestYearlyDeparture, record.largestYearlyDeparture ?? 0),
    maxRentPoints: Math.max(current.maxRentPoints, record.maxRentPoints ?? 0),
  };
  if (record.earliestFoundationYear !== undefined) {
    career.earliestFoundationYear = Math.min(
      current.earliestFoundationYear ?? Infinity,
      record.earliestFoundationYear,
    );
  }
  const changed = (Object.keys(career) as (keyof CareerStatistics)[])
    .some((key) => career[key] !== current[key]);
  return changed ? { ...state, statistics: { ...state.statistics, career } } : state;
}
