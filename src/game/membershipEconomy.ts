import { getNetworkSponsorIncome, getUpgradeEffectTotal, isCourseXUnlocked } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import { getMonthlyNetworkRent } from "./reputation";
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
  memberGroups: GameState["memberGroups"];
  collaborators: GameState["collaborators"];
  courseXUnlocked: boolean;
  trainingBonuses: number;
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

/** Base fee per member, set by the record of active members of the current school. */
export function getMemberFee(peakActiveMembers: number): number {
  let fee: number = GAME_CONFIG.monthlyMemberFee;
  for (const tier of GAME_CONFIG.membershipFeeTiers) {
    if (peakActiveMembers >= tier.members) fee = tier.fee;
  }
  return fee;
}

export function getMonthlyMemberFees(state: GameState): number {
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const baseFees = state.school.activeMembers * getMemberFee(state.school.peakActiveMembers);
  if (
    monthlyMemberFeesCache?.contacts === state.contacts &&
    monthlyMemberFeesCache.memberGroups === state.memberGroups &&
    monthlyMemberFeesCache.courseXUnlocked === courseXUnlocked &&
    haveSameMemberFeeQualifications(
      monthlyMemberFeesCache.collaborators,
      state.collaborators,
    )
  ) {
    monthlyMemberFeesCache.collaborators = state.collaborators;
    return baseFees + monthlyMemberFeesCache.trainingBonuses;
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
  }, 0) + (state.memberGroups ?? []).reduce((total, group) =>
    total + group.count * countVisibleForms(group.forms, courseXUnlocked) *
      GAME_CONFIG.monthlyMemberFormBonus, 0);

  monthlyMemberFeesCache = {
    contacts: state.contacts,
    memberGroups: state.memberGroups,
    collaborators: state.collaborators,
    courseXUnlocked,
    trainingBonuses,
  };
  return baseFees + trainingBonuses;
}

/** Member fees with every multiplier from the school's upgrades. */
export function getMonthlyMembershipIncome(state: GameState): number {
  return getMonthlyMemberFees(state) *
    (1 + getUpgradeEffectTotal(state.upgrades, "membershipIncomeMultiplier") +
      getUpgradeEffectTotal(state.upgrades, "incomeMultiplier"));
}

const DEPOSIT_INTEREST_FUNDS_CAP = 250_000;

/** Conto deposito: monthly interest on the first 250.000 € of funds. */
export function getMonthlyDepositInterest(state: GameState): number {
  const rate = getUpgradeEffectTotal(state.upgrades, "depositInterestRate");
  if (rate <= 0) return 0;
  return roundCurrency(Math.min(Math.max(0, state.school.euros), DEPOSIT_INTEREST_FUNDS_CAP) * rate);
}

export function getMonthlyOperationalIncome(state: GameState): number {
  // Rents of the schools in the network are fixed: no multiplier touches them.
  return getMonthlyMembershipIncome(state) + getMonthlyNetworkRent(state) +
    getMonthlySocialIncome(state) + getMonthlyDepositInterest(state) +
    getNetworkSponsorIncome(state.upgrades, state.network.schoolCount);
}
