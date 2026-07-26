import { getUpgradePrimaryEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import type { GameState, UpgradeLevels } from "./types";

const SOCIAL_CONTENT_CHARACTERS = [
  GAME_CONFIG.socialBaseContentCharacters,
  90_000,
  80_000,
  70_000,
  60_000,
  50_000,
] as const;
const SOCIAL_FOLLOWER_CHANCES = [
  GAME_CONFIG.socialBaseFollowerChance,
  0.6,
  0.7,
  0.8,
  0.9,
  0.95,
] as const;
const SOCIAL_FOLLOWER_VALUES = [
  GAME_CONFIG.socialBaseFollowerValue,
  0.2,
  0.3,
  0.4,
  0.5,
] as const;

function boundedLevel(levels: UpgradeLevels, id: keyof UpgradeLevels, maximum: number): number {
  return Math.min(maximum, Math.max(0, Math.floor(levels[id] ?? 0)));
}

export function getSocialContentCharacters(levels: UpgradeLevels): number {
  return SOCIAL_CONTENT_CHARACTERS[
    boundedLevel(levels, "social-content-synthesis", SOCIAL_CONTENT_CHARACTERS.length - 1)
  ];
}

export function getSocialFollowerChance(levels: UpgradeLevels): number {
  return SOCIAL_FOLLOWER_CHANCES[
    boundedLevel(levels, "social-editorial-plan", SOCIAL_FOLLOWER_CHANCES.length - 1)
  ];
}

export function getSocialDoubleFollowerChance(levels: UpgradeLevels): number {
  return boundedLevel(levels, "social-editorial-plan", 5) >= 5
    ? GAME_CONFIG.socialDoubleFollowerChance
    : 0;
}

export function getSocialEventPromotionBonus(followers: number): number {
  return Math.max(0, followers) * GAME_CONFIG.socialEventPromotionPerFollower;
}

export function getSocialFollowerValue(levels: UpgradeLevels): number {
  return SOCIAL_FOLLOWER_VALUES[
    boundedLevel(levels, "social-sponsorships", SOCIAL_FOLLOWER_VALUES.length - 1)
  ];
}

export function getMonthlySocialIncome(state: GameState): number {
  if (!state.unlocks.social) return 0;
  const anderBonus = getUpgradePrimaryEffectTotal(
    state.upgrades,
    "order-secretariat",
  );
  return roundCurrency(
    state.school.followers *
      getSocialFollowerValue(state.upgrades) *
      (1 + anderBonus),
  );
}
