import { getShortGoalProgress } from "../content/shortGoals";
import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

export type GameArea =
  | "mail"
  | "events"
  | "contacts"
  | "ludowiki"
  | "upgrades"
  | "tournaments"
  | "gadget"
  | "network"
  | "settings";

export function isGameAreaUnlocked(view: GameArea, state: GameState): boolean {
  if (view === "mail" || view === "ludowiki" || view === "settings") return true;
  if (view === "gadget") return state.unlocks.gadget;
  // Opens with the first national title and stays: after a foundation the count keeps it.
  if (view === "network") {
    return state.network.schoolCount > 0 ||
      (state.tournaments.nationalTitlesCurrentSchool ?? 0) >= GAME_CONFIG.prestigeNationalTitles;
  }
  if (state.network.schoolCount > 0) return true;

  if (view === "events") {
    return state.shortGoal.completedCount > 0 || (
      state.shortGoal.definitionId === "send-emails" &&
      getShortGoalProgress(state) >= state.shortGoal.target
    );
  }
  if (view === "contacts") return state.school.fame > 0;
  if (view === "tournaments") {
    return state.school.fame >= GAME_CONFIG.tournamentUnlockMembers;
  }
  if (view === "upgrades") return state.unlocks.upgrades;
  return false;
}

/** The only gate of the prestige: a national title (Arena or Style) won by this school. */
export function getPrestigeRequirements(state: GameState) {
  return {
    nationalTitles: GAME_CONFIG.prestigeNationalTitles,
    currentNationalTitles: state.tournaments.nationalTitlesCurrentSchool ?? 0,
  };
}

export function canFoundSchool(state: GameState): boolean {
  const requirements = getPrestigeRequirements(state);
  return (
    requirements.currentNationalTitles >= requirements.nationalTitles &&
    !Object.values(state.network.secretLegendaries).some(
      (progress) => progress.status === "trial",
    )
  );
}
