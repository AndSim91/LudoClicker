import type { HistoryArchive } from "../types";
import type { MigratableState } from "./types";

/**
 * Removes detailed completed-event records while preserving the aggregate
 * counters used by achievements and runtime identifiers.
 */
export function migrateEventHistoryRemovalState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 81) return state;
  if (!Array.isArray(state.acquisitionEvents) || !state.historyArchive) return state;

  const completedEventsByDefinition = {
    ...state.historyArchive.completedEventsByDefinition,
  };
  const acquisitionEvents = state.acquisitionEvents.filter((event) => {
    if (event.status !== "completed") return true;
    completedEventsByDefinition[event.definitionId] =
      (completedEventsByDefinition[event.definitionId] ?? 0) + 1;
    return false;
  });

  return {
    ...state,
    version: 82,
    acquisitionEvents,
    historyArchive: {
      ...state.historyArchive,
      completedEventsByDefinition,
    } as HistoryArchive,
  };
}
