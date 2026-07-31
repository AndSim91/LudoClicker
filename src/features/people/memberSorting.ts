import {
  getAvailableForms,
  getTrainingCourseTitle,
  getVisibleForms,
} from "../../content/forms";
import {
  getContactPreparation,
  hasUnlockedOfficialStats,
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
  agonistCourseUnlocked: boolean;
  instructorBranchCapacity: number;
  unrestrictedFormBranches: boolean;
  immunityContext: AthleteImmunityContext;
  foundedSchools: number;
  courseXUnlocked: boolean;
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
  if (!hasUnlockedOfficialStats(forms)) return null;
  return getContactPreparation(contact, forms)[key];
}

export function getMemberNextFormLabel(
  contact: Contact,
  context: MemberSortContext,
): string | null {
  const student = getMemberStudent(contact, context);
  if (student.training) {
    if (student.training.formId === "course-x" && !context.courseXUnlocked) {
      return "Formazione in corso";
    }
    return getTrainingCourseTitle(
      student.training.formId,
      context.agonistCourseUnlocked,
      student.training.agonistCourseGrantsStats,
    );
  }
  const collaborator = context.collaboratorsByContactId.get(contact.id);
  const branchCapacity = context.unrestrictedFormBranches
    ? 3
    : collaborator?.assignment === "instructor"
      ? context.instructorBranchCapacity
      : undefined;
  const nextForm = getAvailableForms(
    student,
    context.currentTrainingYear,
    branchCapacity,
    !context.unrestrictedFormBranches && collaborator?.assignment !== "instructor",
    context.annualTrainingLimit,
    context.courseXUnlocked,
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

function getMemberRarityRank(contact: Contact): number {
  return contact.secretLegendaryId ? 4 : RARITY_RANK[contact.rarity];
}

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

interface MemberSortProjection {
  numericValue: number | null;
  textValue: string | null;
  secondaryTextValue: string | null;
}

interface MemberSortEntry extends MemberSortProjection {
  member: Contact;
  index: number;
}

const memberSortProjectionCaches = new WeakMap<
  MemberSortContext,
  Map<MemberSortKey, WeakMap<Contact, MemberSortProjection>>
>();

function createMemberSortProjection(
  member: Contact,
  sort: MemberSort,
  context: MemberSortContext,
): MemberSortProjection {
  let numericValue: number | null = null;
  let textValue: string | null = null;
  let secondaryTextValue: string | null = null;
  switch (sort.key) {
    case "name":
      textValue = `${member.firstName} ${member.lastName}`;
      break;
    case "rarity":
      numericValue = getMemberRarityRank(member);
      break;
    case "path":
      {
        const forms = getMemberStudent(member, context).forms;
        numericValue = getVisibleForms(forms, context.courseXUnlocked).length;
        secondaryTextValue = formatFormPath(forms, context.courseXUnlocked);
      }
      break;
    case "arena":
    case "style":
      numericValue = getMemberVisibleScore(member, sort.key, context);
      break;
    case "status":
      numericValue = getDisplayedRisk(member, context);
      break;
    case "next-form":
      textValue = getMemberNextFormLabel(member, context);
      break;
  }
  return {
    numericValue,
    textValue,
    secondaryTextValue,
  };
}

function getMemberSortProjection(
  member: Contact,
  sort: MemberSort,
  context: MemberSortContext,
): MemberSortProjection {
  let cachesByKey = memberSortProjectionCaches.get(context);
  if (!cachesByKey) {
    cachesByKey = new Map();
    memberSortProjectionCaches.set(context, cachesByKey);
  }
  let cache = cachesByKey.get(sort.key);
  if (!cache) {
    cache = new WeakMap();
    cachesByKey.set(sort.key, cache);
  }
  const cached = cache.get(member);
  if (cached) return cached;
  const projection = createMemberSortProjection(member, sort, context);
  cache.set(member, projection);
  return projection;
}

function compareMemberSortEntries(
  left: MemberSortEntry,
  right: MemberSortEntry,
  sort: MemberSort,
): number {
  let comparison = 0;
  switch (sort.key) {
    case "name":
      comparison = compareText(left.textValue ?? "", right.textValue ?? "");
      break;
    case "rarity":
      comparison = (left.numericValue ?? 0) - (right.numericValue ?? 0);
      break;
    case "path":
      comparison =
        (left.numericValue ?? 0) - (right.numericValue ?? 0) ||
        compareText(
          left.secondaryTextValue ?? "",
          right.secondaryTextValue ?? "",
        );
      break;
    case "arena":
    case "style":
      return compareNullable(
        left.numericValue,
        right.numericValue,
        (leftScore, rightScore) => leftScore - rightScore,
        sort.direction,
      );
    case "status":
      comparison = (left.numericValue ?? 0) - (right.numericValue ?? 0);
      break;
    case "next-form":
      return compareNullable(
        left.textValue,
        right.textValue,
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
    .map((member, index) => ({
      member,
      index,
      ...getMemberSortProjection(member, sort, context),
    }))
    .sort((left, right) =>
      compareMemberSortEntries(left, right, sort) || left.index - right.index
    )
    .map(({ member }) => member);
}
