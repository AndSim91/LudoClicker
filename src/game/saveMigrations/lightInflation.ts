import { createInitialLightInflationState } from "../lightInflation";
import type { MigratableState } from "./types";

export function migrateLightInflationState(state: MigratableState): MigratableState {
  if (state.version !== 62) return state;
  return {
    ...state,
    version: 63,
    lightInflation: createInitialLightInflationState(),
  };
}
