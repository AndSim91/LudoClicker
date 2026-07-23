import type { MigratableState } from "./types";

export function migratePityState(state: MigratableState): MigratableState {
  if (state.version !== 51) return state;

  return {
    ...state,
    version: 52,
    legendaryPity: 0,
  };
}
