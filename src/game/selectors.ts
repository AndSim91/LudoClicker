import { getPooledContactCount } from "./historyArchive";
import type {
  CampaignEmail,
  Collaborator,
  Contact,
  FormId,
  GameState,
  InboxMessage,
  ScheduledTrial,
} from "./types";
import { getVisibleForms, isInstructorForm } from "../content/forms";
import { getCollaboratorProductivity } from "../content/forms";
import {
  isAthleticPreparationUnlocked,
  isCourseXUnlocked,
} from "../content/upgrades";
import { getInstructorPendingReleaseIds } from "./collaboratorManagement";
import { getMessageThreadKey } from "./messages";
import { getMonthlyOperationalIncome } from "./membershipEconomy";
import { getPriorityInstructorQualificationTechnicianIds } from "./instructorPriority";
import { isGameAreaUnlocked } from "./progression";
import {
  getActiveCampaignEmails,
  getAvailableContactCount,
  getCollaboratorsById,
  getContactsById,
  getContactsAwaitingEmailCount,
  getDayTrials,
  getInstructorTeachingCounts,
  getRunningAcquisitionEvents,
  getScheduledTrialsByStart,
} from "./runtimeIndexes";

export function selectActiveEmail(state: GameState): CampaignEmail | undefined {
  // Le email in invio stanno in Posta in uscita: la bozza è la prima ancora da spedire.
  return getActiveCampaignEmails(state.emails).find((email) => email.status !== "sending");
}

/** Email partite nell'ultimo minuto di gioco, in ritmo al minuto (0 sotto le due). */
export function selectRecentEmailsPerMinute(state: GameState): number {
  const now = state.automation.lastProcessedAt;
  let count = 0;
  let oldest = now;
  // ponytail: guarda solo le ultime 60 partite; a ritmi altissimi la stima arrotonda.
  for (let index = state.emails.length - 1; index >= 0 && count < 60; index -= 1) {
    const sentAt = state.emails[index].sentAt;
    if (sentAt === undefined) continue;
    if (sentAt < now - 60_000) break;
    count += 1;
    oldest = sentAt;
  }
  return count < 2 ? 0 : Math.round((count * 60_000) / Math.max(1_000, now - oldest));
}

export function selectActiveContact(state: GameState): Contact | undefined {
  const email = selectActiveEmail(state);
  return email ? getContactsById(state.contacts).get(email.contactId) : undefined;
}

export function selectAvailableContacts(state: GameState): number {
  return getAvailableContactCount(state.contacts) + getPooledContactCount(state);
}

export function selectContactsAwaitingEmail(state: GameState): number {
  return getContactsAwaitingEmailCount(state.contacts) + getPooledContactCount(state);
}

export function selectAvailableEventMembers(state: GameState): number {
  const assignedMembers = getRunningAcquisitionEvents(state.acquisitionEvents)
    .reduce((total, event) => total + event.membersUsed, 0);
  return Math.max(0, state.school.activeMembers - assignedMembers);
}

export function selectBusyInstructorIds(state: GameState): Set<string> {
  const busy = getPriorityInstructorQualificationTechnicianIds(state);
  for (const collaboratorId of getInstructorPendingReleaseIds(state)) {
    busy.add(collaboratorId);
  }
  const teachingCounts = getInstructorTeachingCounts(state.contacts, state.collaborators);
  const capacity = selectInstructorCapacity(state);
  for (const collaborator of state.collaborators) {
    if (collaborator.assignment !== "instructor") continue;
    if ((teachingCounts.get(collaborator.id) ?? 0) >= capacity) {
      busy.add(collaborator.id);
    }
  }
  return busy;
}

export function selectInstructorCapacity(state: GameState): number {
  return Math.min(
    6,
    1 + Math.min(5, state.upgrades["promiscuous-instructor"] ?? 0),
  );
}

export function selectInstructorTeachingCount(state: GameState, instructorId: string): number {
  return getInstructorTeachingCounts(state.contacts, state.collaborators).get(instructorId) ?? 0;
}

export function selectAthleticPreparationInstructorIds(state: GameState): Set<string> {
  const activeInstructorIds = new Set<string>();
  if (
    !isAthleticPreparationUnlocked(state.upgrades) ||
    !state.contacts.some((contact) => contact.status === "enrolled")
  ) return activeInstructorIds;

  const teachingCounts = getInstructorTeachingCounts(state.contacts, state.collaborators);
  const pendingReleaseIds = getInstructorPendingReleaseIds(state);
  const priorityQualificationTechnicianIds =
    getPriorityInstructorQualificationTechnicianIds(state);
  for (const collaborator of state.collaborators) {
    if (
      collaborator.assignment === "instructor" &&
      !pendingReleaseIds.has(collaborator.id) &&
      !collaborator.training &&
      !priorityQualificationTechnicianIds.has(collaborator.id) &&
      (teachingCounts.get(collaborator.id) ?? 0) === 0
    ) activeInstructorIds.add(collaborator.id);
  }
  return activeInstructorIds;
}

export function canInstructorTeachForm(
  state: GameState,
  instructorId: string,
  formId: FormId,
): boolean {
  const instructor = getCollaboratorsById(state.collaborators).get(instructorId);
  return Boolean(
    instructor &&
    (formId !== "course-x" || isCourseXUnlocked(state.upgrades)) &&
    instructor.assignment === "instructor" &&
    !getInstructorPendingReleaseIds(state).has(instructor.id) &&
    instructor.forms.includes(formId) &&
    (!isInstructorForm(formId) || instructor.instructorForms.includes(formId)),
  );
}

// Collaborators are immutable: the ranking keys are computed once per object,
// not at every comparison (a teaching pass compares hundreds of instructors).
const instructorRankCache = new WeakMap<
  Collaborator,
  { formsWithCourseX: number; formsWithoutCourseX: number; productivity: number }
>();

function getInstructorRank(collaborator: Collaborator) {
  let rank = instructorRankCache.get(collaborator);
  if (!rank) {
    rank = {
      formsWithCourseX: getVisibleForms(collaborator.instructorForms, true).length,
      formsWithoutCourseX: getVisibleForms(collaborator.instructorForms, false).length,
      productivity: getCollaboratorProductivity(collaborator, "instructor"),
    };
    instructorRankCache.set(collaborator, rank);
  }
  return rank;
}

export function compareInstructorTeachingPriority(
  left: Collaborator,
  right: Collaborator,
  teachingCounts: ReadonlyMap<string, number>,
  courseXUnlocked = true,
): number {
  const leftRank = getInstructorRank(left);
  const rightRank = getInstructorRank(right);
  return (courseXUnlocked
      ? leftRank.formsWithCourseX - rightRank.formsWithCourseX
      : leftRank.formsWithoutCourseX - rightRank.formsWithoutCourseX) ||
    (teachingCounts.get(left.id) ?? 0) -
      (teachingCounts.get(right.id) ?? 0) ||
    rightRank.productivity - leftRank.productivity ||
    left.joinedAt - right.joinedAt ||
    left.id.localeCompare(right.id);
}

// One pass per game state: the Centro didattico asks this for every row and every Forma.
const instructorAvailabilityCache = new WeakMap<GameState, {
  busyInstructorIds: ReadonlySet<string>;
  pendingReleaseIds: ReadonlySet<string>;
  teachingCounts: ReadonlyMap<string, number>;
  courseXUnlocked: boolean;
}>();

function getInstructorAvailability(state: GameState) {
  let cached = instructorAvailabilityCache.get(state);
  if (!cached) {
    cached = {
      busyInstructorIds: selectBusyInstructorIds(state),
      pendingReleaseIds: getInstructorPendingReleaseIds(state),
      teachingCounts: getInstructorTeachingCounts(state.contacts, state.collaborators),
      courseXUnlocked: isCourseXUnlocked(state.upgrades),
    };
    instructorAvailabilityCache.set(state, cached);
  }
  return cached;
}

export function selectAvailableInstructor(
  state: GameState,
  formId: FormId,
  studentId?: string,
) {
  const { busyInstructorIds, pendingReleaseIds, teachingCounts, courseXUnlocked } =
    getInstructorAvailability(state);
  if (formId === "course-x" && !courseXUnlocked) return undefined;
  const needsQualification = isInstructorForm(formId);
  let best: Collaborator | undefined;
  for (const collaborator of state.collaborators) {
    if (
      collaborator.id === studentId ||
      collaborator.assignment !== "instructor" ||
      pendingReleaseIds.has(collaborator.id) ||
      busyInstructorIds.has(collaborator.id) ||
      !collaborator.forms.includes(formId) ||
      (needsQualification && !collaborator.instructorForms.includes(formId))
    ) continue;
    if (
      !best ||
      compareInstructorTeachingPriority(collaborator, best, teachingCounts, courseXUnlocked) < 0
    ) best = collaborator;
  }
  return best;
}

export function selectUpcomingTrials(state: GameState): ScheduledTrial[] {
  return getScheduledTrialsByStart(state.scheduledTrials);
}

export function selectDayTrials(state: GameState, now: number): ScheduledTrial[] {
  const today = new Date(now);
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  return getDayTrials(state.scheduledTrials, startOfDay);
}

export function selectIncomePerMonth(state: GameState): number {
  return getMonthlyOperationalIncome(state);
}

export function selectVisibleInboxMessages(state: GameState): InboxMessage[] {
  if (isGameAreaUnlocked("tournaments", state)) return state.messages;
  return state.messages.filter((message) => getMessageThreadKey(message) !== "tournaments");
}

export function selectUnreadMessages(state: GameState): number {
  return selectVisibleInboxMessages(state)
    .reduce((total, message) => total + (message.unread ? 1 : 0), 0);
}

export type SentEmailStatus = "In attesa" | "Prova in palestra" | "Iscritto" | "Perso";

export function selectSentEmailStatus(
  state: GameState,
  email: CampaignEmail,
): SentEmailStatus {
  const contact = getContactsById(state.contacts).get(email.contactId);
  if (contact?.status === "enrolled") return "Iscritto";
  if (contact?.status === "lost" || email.status === "lost") return "Perso";
  if (contact?.status === "trialScheduled" || email.status === "trialBooked") {
    return "Prova in palestra";
  }
  return "In attesa";
}
