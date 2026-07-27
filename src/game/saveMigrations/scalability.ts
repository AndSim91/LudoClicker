import { createEmptyHistoryArchive } from "../historyArchive";
import type { MigratableState } from "./types";

export function migrateScalabilityState(state: MigratableState): MigratableState {
  if (state.version !== 35) return state;
  return {
    ...state,
    version: 36,
    historyArchive: createEmptyHistoryArchive(),
  };
}
