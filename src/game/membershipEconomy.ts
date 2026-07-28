import { getVisibleForms } from "../content/forms";
import { getUpgradeEffectTotal, isCourseXUnlocked } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { getMonthlySocialIncome } from "./social";
import type { GameState } from "./types";

export function getMonthlyMemberFees(state: GameState): number {
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  const registeredFormCount = state.contacts.reduce((total, contact) => {
    if (contact.status !== "enrolled") return total;
    const forms = collaboratorsByContactId.get(contact.id)?.forms ?? contact.forms;
    return total + getVisibleForms(forms, courseXUnlocked).length;
  }, 0);

  return state.school.activeMembers * GAME_CONFIG.monthlyMemberFee +
    registeredFormCount * GAME_CONFIG.monthlyMemberFormBonus;
}

export function getMonthlyOperationalIncome(state: GameState): number {
  const networkMultiplier =
    1 + state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  const recurringIncomeBonus = getUpgradeEffectTotal(state.upgrades, "incomeMultiplier");
  const membershipIncome = getMonthlyMemberFees(state) *
    (1 + getUpgradeEffectTotal(state.upgrades, "membershipIncomeMultiplier") +
      recurringIncomeBonus);
  const networkIncome = state.network.schools.length * GAME_CONFIG.networkIncomePerSchool *
    (1 + recurringIncomeBonus);

  return (membershipIncome + networkIncome) * networkMultiplier +
    getMonthlySocialIncome(state);
}
