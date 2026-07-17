import { refreshWritingCampaignCopies } from "./campaignContent";
import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

export function updateProfileName(state: GameState, displayName: string): GameState {
  const normalizedName = displayName
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, GAME_CONFIG.profileNameMaxLength);
  if (!normalizedName || normalizedName === state.profile.displayName) return state;

  return refreshWritingCampaignCopies({
    ...state,
    profile: { displayName: normalizedName },
  });
}
