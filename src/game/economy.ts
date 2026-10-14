import type { GameState } from "./types";

const MAX_CENT_SAFE_EUROS = Number.MAX_SAFE_INTEGER / 100;

export function roundCurrency(amount: number): number {
  if (!Number.isFinite(amount) || Math.abs(amount) > MAX_CENT_SAFE_EUROS) {
    return amount;
  }
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

  const total = state.automation.contactGainBuffer + amount * Math.max(0, gainMultiplier);
  const scaledAmount = Math.floor(total + Number.EPSILON);
  return {
    state: {
      ...state,
      automation: {
        ...state.automation,
        contactGainBuffer: total - scaledAmount,
      },
    },
    amount: scaledAmount,
  };
}
