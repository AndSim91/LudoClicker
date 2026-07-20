import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";

function getFollowerChanceBonus(followers: number): number {
  return Math.max(0, followers) * GAME_CONFIG.socialChancePerFollower;
}

export function getSocialTrialChance(followers: number): number {
  return Math.min(1, GAME_CONFIG.socialTrialChance + getFollowerChanceBonus(followers));
}

export function getSocialContactChance(followers: number): number {
  return Math.min(1, GAME_CONFIG.socialContactChance + getFollowerChanceBonus(followers));
}

export function getSocialIncomePerMember(followers: number): number {
  return roundCurrency(
    GAME_CONFIG.socialIncomePerMember +
      Math.max(0, followers) * GAME_CONFIG.socialIncomePerMemberPerFollower,
  );
}
