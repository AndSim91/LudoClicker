import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

export function hasSocialMemberRequirement(activeMembers: number): boolean {
  return activeMembers >= GAME_CONFIG.socialUnlockMembers;
}

export function unlockSocialIfEligible(state: GameState): GameState {
  if (state.unlocks.social || !hasSocialMemberRequirement(state.school.activeMembers)) {
    return state;
  }

  return {
    ...state,
    school: {
      ...state.school,
      // I follower iniziali fotografano la Fama gia ottenuta. Non generano
      // nuova Fama, altrimenti lo sblocco conterebbe due volte lo stesso
      // progresso.
      followers: state.school.historicMembers,
    },
    unlocks: {
      ...state.unlocks,
      social: true,
    },
  };
}

export function getSocialUnlockRequirementLabel(): string {
  return `${GAME_CONFIG.socialUnlockMembers} iscritti attivi`;
}

export function isCollaboratorAreaVisible(state: GameState): boolean {
  return state.unlocks.collaborators || state.collaborators.length > 0;
}

export function isOfficialSwordSupplierVisible(state: GameState): boolean {
  return state.school.peakActiveMembers >= GAME_CONFIG.officialSwordSupplierUnlockMembers ||
    state.equipment.totalSwords > GAME_CONFIG.initialSwords;
}
