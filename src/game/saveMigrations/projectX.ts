import { createInitialUpgradeLevels } from "../../content/upgrades";
import type { MigratableState } from "./types";

export function migrateProjectXState(state: MigratableState): MigratableState {
  if (state.version !== 59) return state;

  return {
    ...state,
    version: 60,
    upgrades: {
      ...createInitialUpgradeLevels(),
      ...(state.upgrades ?? {}),
    },
  };
}
