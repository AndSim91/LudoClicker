import { getCollaboratorAssignmentLabel } from "../../content/collaboratorRoles";
import { getContactPreparation, hasCompletedCourseX } from "../../game/athleteStats";
import { selectActiveEmail, selectInstructorTeachingCount } from "../../game/selectors";
import type { Collaborator, Contact, GameState } from "../../game/types";
import {
  getCollaboratorAutomationPresentation,
  type CollaboratorAutomationPresentation,
} from "./collaboratorAutomationPresentation";

export type CollaboratorSortKey = "name" | "assignment" | "activity" | "arena" | "style";
export type CollaboratorSortDirection = "ascending" | "descending";

export interface CollaboratorSort {
  key: CollaboratorSortKey;
  direction: CollaboratorSortDirection;
}

export interface CollaboratorSortContext {
  state: GameState;
  contactsById: ReadonlyMap<string, Contact>;
  activeEmail: ReturnType<typeof selectActiveEmail>;
  now: number;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "it", { numeric: true, sensitivity: "base" });
}

function compareNullable(
  left: string | number | null,
  right: string | number | null,
  direction: CollaboratorSortDirection,
): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const comparison = typeof left === "string" && typeof right === "string"
    ? compareText(left, right)
    : Number(left) - Number(right);
  return direction === "ascending" ? comparison : -comparison;
}

function getAutomation(
  collaborator: Collaborator,
  context: CollaboratorSortContext,
): CollaboratorAutomationPresentation {
  return getCollaboratorAutomationPresentation({
    state: context.state,
    collaboratorId: collaborator.id,
    assignment: collaborator.assignment,
    now: context.now,
    activeEmail: context.activeEmail,
  });
}

function getActivityValue(
  collaborator: Collaborator,
  context: CollaboratorSortContext,
): number | null {
  if (collaborator.assignment === "instructor") {
    const teachingCount = selectInstructorTeachingCount(context.state, collaborator.id);
    return teachingCount > 0 ? teachingCount : null;
  }
  return getAutomation(collaborator, context).progress ?? null;
}

function getOfficialScore(
  collaborator: Collaborator,
  key: "arena" | "style",
  context: CollaboratorSortContext,
): number | null {
  const contact = context.contactsById.get(collaborator.contactId);
  if (!contact || !hasCompletedCourseX(collaborator.forms)) return null;
  return getContactPreparation(contact, collaborator.forms)[key];
}

function getSortValue(
  collaborator: Collaborator,
  key: CollaboratorSortKey,
  context: CollaboratorSortContext,
): string | number | null {
  if (key === "name") return collaborator.displayName;
  if (key === "assignment") {
    return collaborator.assignment
      ? getCollaboratorAssignmentLabel(
          collaborator.assignment,
          context.state.unlocks.social,
        )
      : null;
  }
  if (key === "activity") return getActivityValue(collaborator, context);
  return getOfficialScore(collaborator, key, context);
}

export function sortCollaborators(
  collaborators: readonly Collaborator[],
  sort: CollaboratorSort | null,
  context: CollaboratorSortContext,
): Collaborator[] {
  if (!sort) return [...collaborators];
  return collaborators
    .map((collaborator, index) => ({
      collaborator,
      index,
      value: getSortValue(collaborator, sort.key, context),
    }))
    .sort((left, right) =>
      compareNullable(left.value, right.value, sort.direction) ||
      left.index - right.index
    )
    .map(({ collaborator }) => collaborator);
}
