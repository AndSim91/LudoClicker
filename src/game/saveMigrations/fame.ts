import type { MigratableState } from "./types";

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function migrateFameState(state: MigratableState): MigratableState {
  if (state.version !== 64) return state;

  if (!state.school) {
    return { ...state, version: 65 };
  }

  const school = { ...state.school };
  const fame = isNonNegativeSafeInteger(school.historicMembers)
    ? school.historicMembers
    : isNonNegativeSafeInteger(school.fame)
      ? school.fame
      : Math.max(0, school.activeMembers ?? 0);
  delete school.historicMembers;

  return {
    ...state,
    version: 65,
    school: {
      ...school,
      fame,
    },
  };
}
