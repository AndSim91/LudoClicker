import type { MigratableState } from "./types";

function legacyRancoreLevel(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(6, Math.floor(value)));
}

export function migrateAgonistCourseProgressionState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 74) return state;

  const upgrades = state.upgrades ?? {};
  const previousLevel = legacyRancoreLevel(upgrades["agonist-course-intensity"]);

  return {
    ...state,
    version: 75,
    upgrades: {
      ...upgrades,
      "agonist-course-intensity": previousLevel > 0 ? previousLevel + 4 : 0,
    },
  };
}
