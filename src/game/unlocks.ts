import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

export function hasSocialMemberRequirement(activeMembers: number): boolean {
  return activeMembers >= GAME_CONFIG.socialUnlockMembers;
}

export function getSocialUnlockRequirementLabel(): string {
  return `${GAME_CONFIG.socialUnlockMembers} iscritti`;
}

export function isCollaboratorAreaVisible(state: GameState): boolean {
  return state.unlocks.collaborators || state.collaborators.length > 0;
}

export function isOfficialSwordSupplierVisible(state: GameState): boolean {
  return state.school.peakActiveMembers >= GAME_CONFIG.officialSwordSupplierUnlockMembers ||
    state.equipment.totalSwords > GAME_CONFIG.initialSwords;
}
