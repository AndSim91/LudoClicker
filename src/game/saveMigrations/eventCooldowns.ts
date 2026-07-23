import type { GameState } from "../types";
import type { MigratableState } from "./types";

type LegacyActivities = Partial<GameState["activities"]> & {
  nextSparringAt?: number;
};

export function migrateEventCooldownState(state: MigratableState): MigratableState {
  if (state.version !== 53) return state;

  const activities = state.activities as LegacyActivities | undefined;
  const referenceTime = state.lastSavedAt ?? state.createdAt ?? Date.now();
  const nextSparringAt = activities?.nextSparringAt;
  const eventCooldowns = nextSparringAt !== undefined && nextSparringAt > referenceTime
    ? {
        "park-sparring": {
          kind: "realtime" as const,
          startedAt: referenceTime,
          availableAt: nextSparringAt,
        },
      }
    : {};

  return {
    ...state,
    version: 54,
    activities: { eventCooldowns },
  };
}
