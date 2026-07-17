import type { GameState } from "./types";

export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function scaleCurrencyGain(amount: number, gainMultiplier: number): number {
  return roundCurrency(amount * Math.max(0, gainMultiplier));
}

export function scaleContactGain(
  state: GameState,
  amount: number,
  gainMultiplier: number,
): { state: GameState; amount: number } {
  if (gainMultiplier >= 1) return { state, amount };

  const total = state.automation.offlineContactBuffer + amount * Math.max(0, gainMultiplier);
  const scaledAmount = Math.floor(total + Number.EPSILON);
  return {
    state: {
      ...state,
      automation: {
        ...state.automation,
        offlineContactBuffer: total - scaledAmount,
      },
    },
    amount: scaledAmount,
  };
}
