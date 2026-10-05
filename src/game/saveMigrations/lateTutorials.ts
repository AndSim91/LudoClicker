import type { MigratableState } from "./types";

/*
 * v102: four tutorials for the second half of the game and the scene of the
 * first Chronicles key. A save already past them marks them as done or seen,
 * so nothing plays late: a game in progress does not get four lessons at once.
 */
export function migrateLateTutorialsState(state: MigratableState): MigratableState {
  if (state.version !== 101) return state;
  const tournaments = state.tournaments;
  const network = state.network;
  const founded = (network?.schoolCount ?? 0) > 0;
  const done = [
    ...(founded || (tournaments?.results?.length ?? 0) > 0 ? ["first-tournament"] : []),
    ...((state.lightInflation?.increases ?? 0) > 0 ? ["light-inflation-explained"] : []),
    ...(founded || (tournaments?.nationalTitlesCurrentSchool ?? 0) > 0 ? ["network-introduction"] : []),
    ...(founded || tournaments?.reptile?.unlocked ? ["reptile-introduction"] : []),
  ];
  const keySeen = tournaments?.chronicles?.unlocked || (state.statistics?.career?.chroniclesWins ?? 0) > 0;
  const tutorial = state.tutorial;
  const moments = state.moments;
  return {
    ...state,
    version: 102,
    ...(tutorial && done.length > 0
      ? { tutorial: { ...tutorial, completedSceneIds: [...new Set([...tutorial.completedSceneIds, ...done])] } }
      : {}),
    ...(moments && keySeen && !moments.seen.includes("chronicles-key")
      ? { moments: { ...moments, seen: [...moments.seen, "chronicles-key"] } }
      : {}),
  };
}
