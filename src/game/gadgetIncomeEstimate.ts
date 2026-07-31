import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import {
  getGadgetAudience,
  getGadgetMonthlyAttemptCapacity,
} from "./gadgetEconomy";
import { processGadgets } from "./gadgetFlow";
import type { GameState } from "./types";

interface GadgetIncomeEstimateCache {
  products: GameState["gadgets"]["products"];
  upgrades: GameState["upgrades"];
  audience: number;
  monthlyAttemptCapacity: number;
  crossSellRemainder: number;
  crossSellCursor: number;
  value: number;
}

let gadgetIncomeEstimateCache: GadgetIncomeEstimateCache | undefined;

/**
 * Proietta le vendite del prossimo mese con gli stessi scatti usati dal gioco.
 * Non applica decisioni future del giocatore e non modifica lo stato ricevuto.
 */
export function getEstimatedMonthlyGadgetIncome(state: GameState): number {
  if (!state.unlocks.gadget) return 0;

  const audience = getGadgetAudience(state);
  const monthlyAttemptCapacity = getGadgetMonthlyAttemptCapacity(state);
  if (
    gadgetIncomeEstimateCache?.products === state.gadgets.products &&
    gadgetIncomeEstimateCache.upgrades === state.upgrades &&
    gadgetIncomeEstimateCache.audience === audience &&
    gadgetIncomeEstimateCache.monthlyAttemptCapacity === monthlyAttemptCapacity &&
    gadgetIncomeEstimateCache.crossSellRemainder === state.gadgets.crossSellRemainder &&
    gadgetIncomeEstimateCache.crossSellCursor === state.gadgets.crossSellCursor
  ) return gadgetIncomeEstimateCache.value;

  let projectedState = state;
  let elapsedMs = 0;
  while (elapsedMs < GAME_CONFIG.gameMonthMs) {
    const stepMs = Math.min(
      GAME_CONFIG.gameTickMs,
      GAME_CONFIG.gameMonthMs - elapsedMs,
    );
    elapsedMs += stepMs;
    projectedState = processGadgets(projectedState, stepMs, elapsedMs);
  }

  const value = roundCurrency(projectedState.school.euros - state.school.euros);
  gadgetIncomeEstimateCache = {
    products: state.gadgets.products,
    upgrades: state.upgrades,
    audience,
    monthlyAttemptCapacity,
    crossSellRemainder: state.gadgets.crossSellRemainder,
    crossSellCursor: state.gadgets.crossSellCursor,
    value,
  };
  return value;
}
