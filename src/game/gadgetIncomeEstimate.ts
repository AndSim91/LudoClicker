import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import { processGadgets } from "./gadgetFlow";
import type { GameState } from "./types";

/**
 * Proietta le vendite del prossimo mese con gli stessi scatti usati dal gioco.
 * Non applica decisioni future del giocatore e non modifica lo stato ricevuto.
 */
export function getEstimatedMonthlyGadgetIncome(state: GameState): number {
  if (!state.unlocks.gadget) return 0;

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

  return roundCurrency(projectedState.school.euros - state.school.euros);
}
