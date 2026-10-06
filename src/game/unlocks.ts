import { isOfficialSwordSupplierUnlocked } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { addMessage } from "./stateUpdates";
import type { GameState } from "./types";

export function hasSocialCollaboratorRequirement(collaborators: number): boolean {
  return collaborators >= GAME_CONFIG.socialUnlockCollaborators;
}

/** Social opens with the 15th collaborator (decisione del 06/10), once. */
export function unlockSocialIfEligible(state: GameState, now: number): GameState {
  if (state.unlocks.social || !hasSocialCollaboratorRequirement(state.collaborators.length)) {
    return state;
  }

  return addMessage({
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
  },
  now + 2,
  "La Redazione diventa Social",
  `${GAME_CONFIG.socialUnlockCollaborators} collaboratori: qualcuno ha aperto le pagine social della scuola e nessuno ha avuto il coraggio di fermarlo. Chi lavora in Redazione ora porta anche follower e sponsor.`,
  "system",
  );
}

export function getSocialUnlockRequirementLabel(): string {
  return `${GAME_CONFIG.socialUnlockCollaborators} collaboratori`;
}

export function isCollaboratorAreaVisible(state: GameState): boolean {
  return state.unlocks.collaborators || state.collaborators.length > 0;
}

/** Buying swords opens with the Fornitore ufficiale node (Attrezzatura). */
export function isOfficialSwordSupplierVisible(state: GameState): boolean {
  return isOfficialSwordSupplierUnlocked(state.upgrades);
}
