import { getUpgradeEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getEmailBookingChance(state: GameState) {
  const multiplier = 1 + getUpgradeEffectTotal(state.upgrades, "bookingMultiplier");
  return clamp(GAME_CONFIG.emailBookingChance * multiplier, 0.01, 0.7);
}

export function getEnrollmentChance(state: GameState) {
  const multiplier = 1 + getUpgradeEffectTotal(state.upgrades, "enrollmentMultiplier");
  return clamp(GAME_CONFIG.enrollmentChance * multiplier, 0.01, 0.9);
}

export function getEventContactReward(state: GameState, baseReward: number) {
  const multiplier = 1 + getUpgradeEffectTotal(state.upgrades, "eventContactsMultiplier");
  return Math.ceil(baseReward * multiplier);
}

export function getWritingPower(state: GameState) {
  return 1 + Math.floor(getUpgradeEffectTotal(state.upgrades, "writingPower"));
}
