import { isOfficialSwordSupplierUnlocked } from "../content/upgrades";
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
      followers: state.school.fame,
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

/** Buying swords opens with the Fornitore ufficiale node (Attrezzatura). */
export function isOfficialSwordSupplierVisible(state: GameState): boolean {
  return isOfficialSwordSupplierUnlocked(state.upgrades);
}
