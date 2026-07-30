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
  const trainingBonuses = state.contacts.reduce((total, contact) => {
    if (contact.status !== "enrolled") return total;
    const collaborator = collaboratorsByContactId.get(contact.id);
    const forms = getVisibleForms(collaborator?.forms ?? contact.forms, courseXUnlocked);
    if (!collaborator) {
      return total + forms.length * GAME_CONFIG.monthlyMemberFormBonus;
    }

    const technicianForms = new Set(
      getVisibleForms(collaborator.technicianForms ?? [], courseXUnlocked),
    );
    const instructorOnlyForms = getVisibleForms(
      collaborator.instructorForms,
      courseXUnlocked,
    ).filter((formId) => !technicianForms.has(formId));

    return total +
      forms.length * GAME_CONFIG.monthlyMemberFormBonus +
      instructorOnlyForms.length * GAME_CONFIG.monthlyMemberInstructorBonus +
      technicianForms.size * GAME_CONFIG.monthlyMemberTechnicianBonus;
  }, 0);

  return state.school.activeMembers * GAME_CONFIG.monthlyMemberFee +
    trainingBonuses;
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
