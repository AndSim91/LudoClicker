import type { MigratableState } from "./types";

function legacyLevel(value: number | undefined, maximum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(maximum, Math.floor(value)));
}

export function migrateAthleticPreparationMergeState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 73) return state;

  const upgrades = state.upgrades ?? {};
  const preparationLevel = legacyLevel(upgrades["athletic-preparation"], 5);
  const rancoreLevel = legacyLevel(upgrades["agonist-course-intensity"], 4);
  const mergedLevel = Math.max(
    preparationLevel,
    rancoreLevel > 0 ? rancoreLevel + 1 : 0,
  );

  return {
    ...state,
    version: 74,
    upgrades: {
      ...upgrades,
      "athletic-preparation": 0,
      "agonist-course-intensity": mergedLevel,
    },
  };
}
