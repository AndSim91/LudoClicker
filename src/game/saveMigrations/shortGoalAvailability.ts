import { SHORT_GOALS } from "../../content/shortGoals";
import { GAME_CONFIG } from "../config";
import type { ShortGoalId } from "../types";
import type { MigratableState } from "./types";

export function migrateShortGoalAvailabilityState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 75) return state;

  const shortGoal = state.shortGoal;
  const definitionId = shortGoal?.definitionId as ShortGoalId | undefined;
  const definition = definitionId ? SHORT_GOALS[definitionId] : undefined;
  const baseline = shortGoal?.baseline ?? 0;
  const currentValue = definition
    ? state.statistics?.[definition.metric] ?? baseline
    : baseline;
  const hasProgress = Math.max(0, currentValue - baseline) >= 1;
  const isBelowActivationBalance =
    (state.school?.euros ?? 0) < GAME_CONFIG.shortGoalActivationBalance;

  return {
    ...state,
    version: 76,
    shortGoal: shortGoal
      ? {
          ...shortGoal,
          isActive: isBelowActivationBalance || hasProgress,
          reactivationStartedAt: undefined,
        }
      : shortGoal,
  };
}
