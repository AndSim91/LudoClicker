import type { MigratableState } from "./types";

/*
 * v107 (08/10/2026): Tornei opens with 8 athletes with Forma 1, with its own
 * tutorial; after the first Torneo Scolastico the «Tappa 1» scene plays.
 * A save opens Tornei if the old rule (fame 6 or a school founded) had opened it, and marks as
 * done what it has already passed, so nothing plays late.
 */
export const TOURNAMENTS_OPENING_TUTORIAL_SCENE_ID = "tournaments-opening";
export const SCHOOL_TOURNAMENT_MOMENT = "school-tournament";

export function migrateTournamentsStageState(state: MigratableState): MigratableState {
  if (state.version !== 106) return state;
  const unlocks = state.unlocks;
  const founded = (state.network?.schoolCount ?? 0) > 0;
  const playedSchool = (state.tournaments?.results ?? []).some((result) => result.level === "school") ||
    Boolean(state.tutorial?.completedSceneIds.includes("first-tournament"));
  const tournaments = Boolean(unlocks?.forms && (founded || (state.school?.fame ?? 0) >= 6 || playedSchool));
  const tutorial = state.tutorial;
  const markTutorial = tutorial && (tournaments || founded) &&
    !tutorial.completedSceneIds.includes(TOURNAMENTS_OPENING_TUTORIAL_SCENE_ID);
  const moments = state.moments;
  const markMoment = moments && (playedSchool || founded) && !moments.seen.includes(SCHOOL_TOURNAMENT_MOMENT);
  return {
    ...state,
    version: 107,
    ...(unlocks ? { unlocks: { ...unlocks, tournaments } } : {}),
    ...(markTutorial
      ? { tutorial: { ...tutorial, completedSceneIds: [...tutorial.completedSceneIds, TOURNAMENTS_OPENING_TUTORIAL_SCENE_ID] } }
      : {}),
    ...(markMoment ? { moments: { ...moments, seen: [...moments.seen, SCHOOL_TOURNAMENT_MOMENT] } } : {}),
  };
}
