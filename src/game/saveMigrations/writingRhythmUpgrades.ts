import { createInitialUpgradeLevels } from "../../content/upgrades";
import type { UpgradeLevels } from "../types";
import type { MigratableState } from "./types";

/** Adds the two Scrittura extension nodes (Ritmo di battitura, Frasi fatte) at level 0. */
export function migrateWritingRhythmUpgradesState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 82) return state;
  return {
    ...state,
    version: 83,
    upgrades: { ...createInitialUpgradeLevels(), ...(state.upgrades ?? {}) } as UpgradeLevels,
  };
}
