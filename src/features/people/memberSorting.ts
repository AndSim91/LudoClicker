import {
  getAvailableForms,
  getTrainingCourseTitle,
} from "../../content/forms";
import {
  getContactPreparation,
  hasCompletedCourseX,
} from "../../game/athleteStats";
import { getMemberAnnualDepartureChance } from "../../game/formulas";
import {
  getAthleteImmunityStatus,
  type AthleteImmunityContext,
} from "../../game/athleteImmunity";
import type { Collaborator, Contact } from "../../game/types";
import { formatFormPath } from "./peoplePresentation";

export type MemberSortKey =
  | "name"
  | "rarity"
  | "path"
  | "arena"
  | "style"
  | "status"
  | "next-form";

export type MemberSortDirection = "ascending" | "descending";

export interface MemberSort {
  key: MemberSortKey;
  direction: MemberSortDirection;
}

export interface MemberSortContext {
  currentTrainingYear: number;
  annualTrainingLimit: number;
  technicalArenaLevel: number;
  immunityContext: AthleteImmunityContext;
  foundedSchools: number;
  collaboratorsByContactId: ReadonlyMap<string, Collaborator>;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "it", { numeric: true, sensitivity: "base" });
}

export function getMemberStudent(contact: Contact, context: MemberSortContext) {
  return context.collaboratorsByContactId.get(contact.id) ?? contact;
}

export function getMemberVisibleScore(
  contact: Contact,
  key: "arena" | "style",
  context: MemberSortContext,
): number | null {
  const forms = getMemberStudent(contact, context).forms;
  if (!hasCompletedCourseX(forms)) return null;
  return getContactPreparation(contact, forms)[key];
}

export function getMemberNextFormLabel(
  contact: Contact,
  context: MemberSortContext,
): string | null {
  if (context.collaboratorsByContactId.has(contact.id)) return "Collaboratore";
  if (contact.training) {
    return getTrainingCourseTitle(
      contact.training.formId,
      context.technicalArenaLevel,
      contact.training.agonistCourseGrantsStats,
    );
  }
  const nextForm = getAvailableForms(
    contact,
    context.currentTrainingYear,
    undefined,
    true,
    context.annualTrainingLimit,
  )[0];
  if (!nextForm) return null;
  return nextForm.longName;
}

const RARITY_RANK: Record<Contact["rarity"], number> = {
  common: 0,
  rare: 1,
  "ultra-rare": 2,
  legendary: 3,
};

function getDisplayedRisk(contact: Contact, context: MemberSortContext): number {
  const student = getMemberStudent(contact, context);
  const immunity = getAthleteImmunityStatus(
    context.immunityContext,
    contact,
    student,
    context.collaboratorsByContactId.has(contact.id),
  );
  if (immunity.annualRollout) {
    return 0;
  }
  return getMemberAnnualDepartureChance(
    student.forms,
    contact.rarity,
    context.foundedSchools,
  );
}

function compareNullable<T>(
  left: T | null,
  right: T | null,
  compare: (leftValue: T, rightValue: T) => number,
  direction: MemberSortDirection,
): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const comparison = compare(left, right);
  return direction === "ascending" ? comparison : -comparison;
}

function compareMembers(
  left: Contact,
  right: Contact,
  sort: MemberSort,
  context: MemberSortContext,
): number {
  let comparison = 0;
  switch (sort.key) {
    case "name":
      comparison = compareText(
        `${left.firstName} ${left.lastName}`,
        `${right.firstName} ${right.lastName}`,
      );
      break;
    case "rarity":
      comparison = RARITY_RANK[left.rarity] - RARITY_RANK[right.rarity];
      break;
    case "path":
      {
        const leftForms = getMemberStudent(left, context).forms;
        const rightForms = getMemberStudent(right, context).forms;
        comparison = leftForms.length - rightForms.length ||
          compareText(formatFormPath(leftForms), formatFormPath(rightForms));
      }
      break;
    case "arena":
    case "style":
      return compareNullable(
        getMemberVisibleScore(left, sort.key, context),
        getMemberVisibleScore(right, sort.key, context),
        (leftScore, rightScore) => leftScore - rightScore,
        sort.direction,
      );
    case "status":
      comparison = getDisplayedRisk(left, context) - getDisplayedRisk(right, context);
      break;
    case "next-form":
      return compareNullable(
        getMemberNextFormLabel(left, context),
        getMemberNextFormLabel(right, context),
        compareText,
        sort.direction,
      );
  }
  return sort.direction === "ascending" ? comparison : -comparison;
}

export function sortMembers(
  members: Contact[],
  sort: MemberSort | null,
  context: MemberSortContext,
): Contact[] {
  if (!sort) return members;
  return members
    .map((member, index) => ({ member, index }))
    .sort((left, right) =>
      compareMembers(left.member, right.member, sort, context) || left.index - right.index
    )
    .map(({ member }) => member);
}
