import type { MigratableState } from "./types";

/*
 * v103: the opening of Social and of the Laboratorio Gadget become scenes.
 * Saves that already opened them, or already saw their tutorial in an earlier
 * school, mark the scene as seen, so it never plays late.
 */
const SCENES = [
  { moment: "social", unlock: "social", tutorial: "social-evolution" },
  { moment: "gadget", unlock: "gadget", tutorial: "gadget-laboratory" },
] as const;

export function migrateSocialGadgetMomentsState(state: MigratableState): MigratableState {
  if (state.version !== 102) return state;
  const moments = state.moments;
  if (!moments) return { ...state, version: 103 };
  const done = new Set([
    ...(state.tutorial?.completedSceneIds ?? []),
    ...(state.tutorial?.skippedSceneIds ?? []),
  ]);
  const seen = SCENES
    .filter(({ moment, unlock, tutorial }) =>
      !moments.seen.includes(moment) && (state.unlocks?.[unlock] || done.has(tutorial)))
    .map(({ moment }) => moment);
  return {
    ...state,
    version: 103,
    ...(seen.length > 0 ? { moments: { ...moments, seen: [...moments.seen, ...seen] } } : {}),
  };
}
