import type { MigratableState } from "./types";

/*
 * v90, Inflazione di Luce proportional to wealth and demand: the 10%-per-sword
 * chance becomes the count of swords bought since the last January (10 points
 * = 1 sword), the income year starts now, and every past increase was +10%.
 */
export function migrateLightInflationDemandState(state: MigratableState): MigratableState {
  if (state.version !== 89) return state;
  const old = state.lightInflation as
    | (Partial<NonNullable<MigratableState["lightInflation"]>> & { chancePercent?: number })
    | undefined;
  if (!old) return { ...state, version: 90 };
  const { chancePercent = 0, ...rest } = old;
  const priceMultiplier = old.priceMultiplier ?? 1;
  const purchasedSwords = Math.round(chancePercent / 10);
  return {
    ...state,
    version: 90,
    lightInflation: {
      ...rest,
      priceMultiplier,
      increases: Math.round(Math.log(priceMultiplier) / Math.log(1.1)),
      purchasedSwords,
      swordsBeforePurchases: Math.max(0, (state.equipment?.totalSwords ?? 0) - purchasedSwords),
      eurosEarnedAtCheck: state.statistics?.eurosEarned ?? 0,
      event: old.event ? { ...old.event, increase: 0.1 } : undefined,
    },
  };
}
