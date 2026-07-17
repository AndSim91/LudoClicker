import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

export type GameArea =
  | "mail"
  | "events"
  | "contacts"
  | "upgrades"
  | "statistics"
  | "settings";

export function isGameAreaUnlocked(view: GameArea, state: GameState): boolean {
  if (view === "mail" || view === "settings") return true;
  if (state.network.schools.length > 0) return true;

  if (view === "events") {
    const hasCampaignQueue = state.contacts.some(
      (contact) => contact.status === "available" || contact.status === "writing",
    );
    return state.statistics.emailsSent >= GAME_CONFIG.eventsUnlockEmailsSent || !hasCampaignQueue;
  }
  if (view === "contacts") return state.school.historicMembers > 0;
  if (view === "upgrades") return state.unlocks.upgrades;
  return state.statistics.eventsCompleted > 0 ||
    state.equipment.wear > 0 ||
    state.unlocks.collaborators ||
    state.unlocks.social;
}

export function getPrestigeRequirements(state: GameState) {
  const cycle = state.network.schools.length + 1;
  return {
    historicMembers: GAME_CONFIG.prestigeHistoricMembers * cycle,
    collaborators: GAME_CONFIG.prestigeCollaborators + (cycle - 1) * 2,
    events: GAME_CONFIG.prestigeEvents * cycle,
  };
}

export function canFoundSchool(state: GameState): boolean {
  const requirements = getPrestigeRequirements(state);
  return (
    state.school.historicMembers >= requirements.historicMembers &&
    state.collaborators.length >= requirements.collaborators &&
    state.statistics.eventsCompleted >= requirements.events
  );
}
