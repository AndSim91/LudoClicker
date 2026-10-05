import type { MigratableState } from "./types";

/*
 * v100: upgrades open by points spent in their branch. Levels already bought stay.
 * Occhio del Maestro starts at level 1, so Arena and Stile stay visible after
 * Corso Y as before; with the automatic assignment on, Istruttori in e-Learning
 * starts at level 1, the Forma 1 those Istruttori already took on their own.
 */
export function migratePointUnlocksState(state: MigratableState): MigratableState {
  if (state.version !== 99) return state;
  const automatic = Boolean(state.collaboratorManagement?.automaticShares);
  return {
    ...state,
    version: 100,
    upgrades: {
      ...state.upgrades,
      "talent-eye": Math.max(1, state.upgrades?.["talent-eye"] ?? 0),
      ...(automatic ? { "e-learning": Math.max(1, state.upgrades?.["e-learning"] ?? 0) } : {}),
    },
  };
}
