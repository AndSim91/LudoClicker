import { getUpgradeEffectTotal, isCourseXUnlocked } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { getMonthlySocialIncome } from "./social";
import type { Collaborator, Contact, FormId, GameState } from "./types";

interface MemberFeeContributionCacheEntry {
  forms: readonly FormId[];
  instructorForms?: readonly FormId[];
  technicianForms?: readonly FormId[];
  hasCollaborator: boolean;
  value: number;
}

interface MonthlyMemberFeesCache {
  contacts: GameState["contacts"];
  collaborators: GameState["collaborators"];
  activeMembers: number;
  courseXUnlocked: boolean;
  value: number;
}

const memberFeeContributionCache = new WeakMap<
  Contact,
  [MemberFeeContributionCacheEntry?, MemberFeeContributionCacheEntry?]
>();
let monthlyMemberFeesCache: MonthlyMemberFeesCache | undefined;

function countVisibleForms(forms: readonly FormId[], courseXUnlocked: boolean): number {
  if (courseXUnlocked) return forms.length;
  let count = 0;
  for (const formId of forms) {
    if (formId !== "course-x") count += 1;
  }
  return count;
}

function getMemberTrainingBonus(
  contact: Contact,
  collaborator: Collaborator | undefined,
  courseXUnlocked: boolean,
): number {
  const forms = collaborator?.forms ?? contact.forms;
  const instructorForms = collaborator?.instructorForms;
  const technicianForms = collaborator?.technicianForms;
  const cacheIndex = courseXUnlocked ? 1 : 0;
  const entries = memberFeeContributionCache.get(contact) ?? [];
  const cached = entries[cacheIndex];
  if (
    cached?.forms === forms &&
    cached.instructorForms === instructorForms &&
    cached.technicianForms === technicianForms &&
    cached.hasCollaborator === Boolean(collaborator)
  ) return cached.value;

  let value = countVisibleForms(forms, courseXUnlocked) *
    GAME_CONFIG.monthlyMemberFormBonus;
  if (collaborator) {
    const visibleTechnicianForms = new Set<FormId>();
    for (const formId of technicianForms ?? []) {
      if (courseXUnlocked || formId !== "course-x") {
        visibleTechnicianForms.add(formId);
      }
    }
    let instructorOnlyForms = 0;
    for (const formId of instructorForms ?? []) {
      if (
        (courseXUnlocked || formId !== "course-x") &&
        !visibleTechnicianForms.has(formId)
      ) instructorOnlyForms += 1;
    }
    value += instructorOnlyForms * GAME_CONFIG.monthlyMemberInstructorBonus +
      visibleTechnicianForms.size * GAME_CONFIG.monthlyMemberTechnicianBonus;
  }

  entries[cacheIndex] = {
    forms,
    instructorForms,
    technicianForms,
    hasCollaborator: Boolean(collaborator),
    value,
  };
  memberFeeContributionCache.set(contact, entries);
  return value;
}

function haveSameMemberFeeQualifications(
  left: GameState["collaborators"],
  right: GameState["collaborators"],
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const previous = left[index];
    const current = right[index];
    if (
      previous.contactId !== current.contactId ||
      previous.forms !== current.forms ||
      previous.instructorForms !== current.instructorForms ||
      previous.technicianForms !== current.technicianForms
    ) return false;
  }
  return true;
}

export function getMonthlyMemberFees(state: GameState): number {
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  if (
    monthlyMemberFeesCache?.contacts === state.contacts &&
    monthlyMemberFeesCache.activeMembers === state.school.activeMembers &&
    monthlyMemberFeesCache.courseXUnlocked === courseXUnlocked &&
    haveSameMemberFeeQualifications(
      monthlyMemberFeesCache.collaborators,
      state.collaborators,
    )
  ) {
    monthlyMemberFeesCache.collaborators = state.collaborators;
    return monthlyMemberFeesCache.value;
  }

  const collaboratorsByContactId = new Map(
    state.collaborators.map((collaborator) => [collaborator.contactId, collaborator]),
  );
  const trainingBonuses = state.contacts.reduce((total, contact) => {
    if (contact.status !== "enrolled") return total;
    return total + getMemberTrainingBonus(
      contact,
      collaboratorsByContactId.get(contact.id),
      courseXUnlocked,
    );
  }, 0);

  const value = state.school.activeMembers * GAME_CONFIG.monthlyMemberFee +
    trainingBonuses;
  monthlyMemberFeesCache = {
    contacts: state.contacts,
    collaborators: state.collaborators,
    activeMembers: state.school.activeMembers,
    courseXUnlocked,
    value,
  };
  return value;
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
