import { getUpgradeEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { getMonthlySocialIncome } from "./social";
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

export function getMonthlyOperationalIncome(state: GameState): number {
  const networkMultiplier =
    1 + state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  const membershipIncome = (
    getMonthlyMemberFees(state) +
      state.network.schools.length * GAME_CONFIG.networkIncomePerSchool
  ) * (1 + getUpgradeEffectTotal(state.upgrades, "incomeMultiplier")) *
    networkMultiplier;

  return membershipIncome + getMonthlySocialIncome(state);
}
