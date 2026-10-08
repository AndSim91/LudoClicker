import { getCareer } from "./career";
import type { GameState, MomentKey, SpecialCollaboratorId } from "./types";

/*
 * Animated moments (4.2): the Consiglio delle Onde (sector view, 8 collaborators),
 * the first win of each major tournament and each Leggendario joining for the
 * first time ever, the birth of the Torneo della Superba, the first Chronicles key,
 * the opening of the Laboratorio Gadget and of the Social. Each plays once per save: the key goes to `seen` when it is
 * queued, the UI shows the queue and pauses. The foundation and the Inflazione
 * di Luce are queued directly and play every time.
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
    // Tappa 1 (08/10/2026): the first Torneo Scolastico played, once per save, before its tutorial.
    ...((state.tournaments?.results ?? []).some((result) => result.level === "school") ? [SCHOOL_TOURNAMENT_MOMENT] : []),
    ...VICTORY_MOMENT_LEVELS.filter((level) => wins[level] > 0).map((level) => `victory:${level}`),
    // Right after the Champion's Arena scene that opens it, before its tutorial (optional: old migrations run this too).
    ...(state.unlocks?.gadget ? [GADGET_MOMENT] : []),
    ...(state.network.superbaTournament ? [SUPERBA_MOMENT] : []),
    // The first key of the playthrough: `seen` outlives the foundations, `unlocked` does not.
    // Optional: the v88 migration runs this on saves older than the Chronicles.
    ...(state.tournaments?.chronicles?.unlocked ? [CHRONICLES_KEY_MOMENT] : []),
    ...getEverEnrolledLegendaryIds(state).map((id) => `legendary:${id}`),
    ...(state.collaboratorManagement.aggregateViewUnlocked ? ["council"] : []),
    ...(state.unlocks?.social ? [SOCIAL_MOMENT] : []),
  ];
}

/** Tappa 1: the podium of the first Torneo Scolastico (the v107 migration marks it seen on saves past it). */
export const SCHOOL_TOURNAMENT_MOMENT = "school-tournament";

/** The Reptile becomes, for good, the Torneo della Superba (after the victory scene, if any). */
export const SUPERBA_MOMENT = "superba";

/** The Redazione becomes Social (15th collaborator), before its tutorial. */
export const SOCIAL_MOMENT = "social";

/** The Laboratorio Gadget opens (first Champion's Arena win), before its tutorial. */
export const GADGET_MOMENT = "gadget";

/** The first key of the Chronicles opens their door (after the Champion's Arena scene). */
export const CHRONICLES_KEY_MOMENT = "chronicles-key";

/** The scene of a new school: queued by foundSchool at every foundation, never marked as seen. */
export const FOUNDATION_MOMENT = "foundation";

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
