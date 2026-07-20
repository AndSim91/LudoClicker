import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

export function getMonthlyMemberFees(state: GameState): number {
  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  const registeredFormCount = state.contacts.reduce((total, contact) => {
    if (contact.status !== "enrolled") return total;
    const forms = collaboratorsByContactId.get(contact.id)?.forms ?? contact.forms;
    return total + forms.length;
  }, 0);

  return state.school.activeMembers * GAME_CONFIG.monthlyMemberFee +
    registeredFormCount * GAME_CONFIG.monthlyMemberFormBonus;
}
