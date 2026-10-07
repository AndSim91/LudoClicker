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
  // Opens with the first Accademico title and stays: after a foundation the count keeps it.
  if (view === "network") {
    return state.network.schoolCount > 0 || hasPrestigeTitle(state);
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

/**
 * The only gate of the prestige (decisione del 07/10): an Accademico title
 * (Arena or Style) won by this school. A national title counts too, so a game
 * saved before the change keeps its open Rete.
 */
export function getPrestigeRequirements(state: GameState) {
  const academy = state.tournaments.academyTitlesCurrentSchool ?? 0;
  const national = state.tournaments.nationalTitlesCurrentSchool ?? 0;
  return {
    academyTitles: GAME_CONFIG.prestigeAcademyTitles,
    currentAcademyTitles: Math.max(academy, national > 0 ? GAME_CONFIG.prestigeAcademyTitles : 0),
  };
}

export function hasPrestigeTitle(state: GameState): boolean {
  const requirements = getPrestigeRequirements(state);
  return requirements.currentAcademyTitles >= requirements.academyTitles;
}

export function canFoundSchool(state: GameState): boolean {
  return (
    hasPrestigeTitle(state) &&
    !Object.values(state.network.secretLegendaries).some(
      (progress) => progress.status === "trial",
    )
  );
}
