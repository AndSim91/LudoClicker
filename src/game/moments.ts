import { getCareer } from "./career";
import type { GameState, MomentKey, SpecialCollaboratorId } from "./types";

/*
 * Animated moments (4.2): the first collaborator (the Consiglio delle Onde),
 * the first school founded, the first win of each major tournament and each
 * Leggendario joining for the first time ever. Each plays once per save: the
 * key goes to `seen` when it is queued, the UI shows the queue and pauses.
 */

export const VICTORY_MOMENT_LEVELS = ["national", "champions", "reptile", "chronicles"] as const;
export type VictoryMomentLevel = (typeof VICTORY_MOMENT_LEVELS)[number];

/** Leggendari that joined one of the player's schools at least once. */
export function getEverEnrolledLegendaryIds(
  state: Pick<GameState, "legendaryCollaborators">,
): SpecialCollaboratorId[] {
  return [...new Set([
    ...state.legendaryCollaborators.enrolledProfileIds,
    ...Object.keys(state.legendaryCollaborators.retainedProgress) as SpecialCollaboratorId[],
  ])];
}

/** Every moment whose condition holds, in the order they should play. */
export function getReachedMomentKeys(state: GameState): MomentKey[] {
  const career = getCareer(state);
  const wins: Record<VictoryMomentLevel, number> = {
    national: career.nationalTitles,
    champions: career.championsWins,
    reptile: career.reptileWins,
    chronicles: career.chroniclesWins,
  };
  return [
    ...VICTORY_MOMENT_LEVELS.filter((level) => wins[level] > 0).map((level) => `victory:${level}`),
    ...getEverEnrolledLegendaryIds(state).map((id) => `legendary:${id}`),
    ...(state.collaborators.length > 0 ? ["council"] : []),
    ...(state.network.schoolCount > 0 ? ["foundation"] : []),
  ];
}

export function queueMoments(state: GameState): GameState {
  const seen = new Set(state.moments.seen);
  const added = getReachedMomentKeys(state).filter((key) => !seen.has(key));
  if (added.length === 0) return state;
  return {
    ...state,
    moments: {
      seen: [...state.moments.seen, ...added],
      queue: [...state.moments.queue, ...added],
    },
  };
}

export function dismissMoment(state: GameState): GameState {
  if (state.moments.queue.length === 0) return state;
  return { ...state, moments: { ...state.moments, queue: state.moments.queue.slice(1) } };
}
