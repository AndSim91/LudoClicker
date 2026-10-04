import { createInitialCareerStatistics } from "../career";
import type { MigratableState } from "./types";

// The two old achievements whose condition cannot be met again later keep their id as secrets.
const KEPT_ACHIEVEMENT_IDS = new Set(["persistent-invites", "no-recognizable-reference"]);

/*
 * v87, Traguardi a livelli (4.4): the old achievements are dropped (the tiers
 * they match unlock again at the next tick) except the two secrets, and the
 * career counters start from what the save still knows.
 */
export function migrateCareerAchievementsState(state: MigratableState): MigratableState {
  if (state.version !== 86) return state;
  const schools = state.network?.schools ?? [];
  const tournaments = state.tournaments;
  const career = {
    ...createInitialCareerStatistics(),
    agonistCourses: (state.contacts ?? []).reduce(
      (total, contact) => total + (contact.agonistCourseCompletions ?? 0),
      0,
    ),
    nationalTitles: schools.length + (tournaments?.nationalTitlesCurrentSchool ?? 0),
    championsWins: schools.filter((school) => school.championsWin).length +
      (tournaments?.championsVictoryCurrentSchool ? 1 : 0),
    reptileWins: schools.filter((school) => school.reptileWin).length +
      (tournaments?.reptile?.victories ?? 0),
    chroniclesWins: schools.filter((school) => school.chroniclesWin).length +
      (tournaments?.chroniclesVictoryCurrentSchool ? 1 : 0),
    reputationEarned: (state.network?.reputation ?? 0) +
      Object.values(state.network?.reputationUpgrades ?? {}).reduce<number>((total, level) => total + (level ?? 0), 0),
  };
  return {
    ...state,
    version: 87,
    achievements: (state.achievements ?? []).filter((id) => KEPT_ACHIEVEMENT_IDS.has(id)),
    statistics: state.statistics ? { ...state.statistics, career } : state.statistics,
  };
}
