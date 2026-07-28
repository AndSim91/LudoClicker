import { getShortGoalProgress } from "../content/shortGoals";
import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

export type GameArea =
  | "mail"
  | "events"
  | "contacts"
  | "upgrades"
  | "tournaments"
  | "gadget"
  | "settings";

export function isGameAreaUnlocked(view: GameArea, state: GameState): boolean {
  if (view === "mail" || view === "settings") return true;
  if (view === "gadget") return state.unlocks.gadget;
  if (state.network.schools.length > 0) return true;

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

export function getPrestigeRequirements(state: GameState) {
  const cycle = state.network.schools.length + 1;
  return {
    fame: GAME_CONFIG.prestigeFame * cycle,
    collaborators: GAME_CONFIG.prestigeCollaborators + (cycle - 1) * 2,
    events: GAME_CONFIG.prestigeEvents * cycle,
  };
}

export function canFoundSchool(state: GameState): boolean {
  const requirements = getPrestigeRequirements(state);
  return (
    state.school.fame >= requirements.fame &&
    state.collaborators.length >= requirements.collaborators &&
    state.statistics.eventsCompleted >= requirements.events &&
    state.tournaments.championsVictoryCurrentSchool &&
    !Object.values(state.network.secretLegendaries).some(
      (progress) => progress.status === "trial",
    )
  );
}
