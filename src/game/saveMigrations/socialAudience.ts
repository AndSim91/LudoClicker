import type { GameState } from "../types";
import type { MigratableState } from "./types";

const SOCIAL_SPONSORSHIP_MAX_LEVEL = 4;

export function migrateSocialAudienceState(state: MigratableState): MigratableState {
  if (state.version !== 60) return state;

  return {
    ...state,
    version: 61,
    upgrades: state.upgrades
      ? {
          ...state.upgrades,
          "social-sponsorships": Math.min(
            SOCIAL_SPONSORSHIP_MAX_LEVEL,
            Math.max(0, state.upgrades["social-sponsorships"] ?? 0),
          ),
        } as GameState["upgrades"]
      : state.upgrades,
  };
}
