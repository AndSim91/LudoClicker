import { getUpgradePrimaryEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import type { GameState, UpgradeLevels } from "./types";

const SOCIAL_CONTENT_CHARACTERS = [
  GAME_CONFIG.socialBaseContentCharacters,
  5_000,
  3_500,
  2_000,
  1_000,
] as const;
const SOCIAL_CONTACT_CAPS = [
  GAME_CONFIG.socialBaseContactChanceCap,
  0.075,
  0.1,
  0.15,
  0.2,
  0.25,
] as const;
const SOCIAL_FOLLOWER_VALUES = [
  GAME_CONFIG.socialBaseFollowerValue,
  0.05,
  0.075,
  0.1,
  0.2,
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
  const level = boundedLevel(
    levels,
    "social-editorial-plan",
    5,
  );
  return GAME_CONFIG.socialBaseFollowerChance + level * 0.01;
}

export function getSocialContactChanceCap(levels: UpgradeLevels): number {
  return SOCIAL_CONTACT_CAPS[
    boundedLevel(levels, "social-content-distribution", SOCIAL_CONTACT_CAPS.length - 1)
  ];
}

export function getSocialContactChance(
  followers: number,
  levels: UpgradeLevels,
): number {
  return Math.min(
    getSocialContactChanceCap(levels),
    GAME_CONFIG.socialBaseContactChance +
      Math.max(0, followers) * GAME_CONFIG.socialContactChancePerFollower,
  );
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
