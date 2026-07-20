import type {
  CampaignEmail,
  Contact,
  FormId,
  GameState,
  InboxMessage,
  ScheduledTrial,
} from "./types";
import { GAME_CONFIG } from "./config";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { isInstructorForm } from "../content/forms";
import { getMessageThreadKey } from "./messages";
import { getMonthlyMemberFees } from "./membershipEconomy";
import { isGameAreaUnlocked } from "./progression";
import {
  getActiveCampaignEmails,
  getAvailableContactCount,
  getCollaboratorsById,
  getCompletedTrialsByStartDay,
  getContactsById,
  getContactsAwaitingEmailCount,
  getInstructorTeachingCounts,
  getRunningAcquisitionEvents,
  getScheduledTrialsByStart,
} from "./runtimeIndexes";

export function selectActiveEmail(state: GameState): CampaignEmail | undefined {
  return getActiveCampaignEmails(state.emails)[0];
}

export function selectActiveContact(state: GameState): Contact | undefined {
  const email = selectActiveEmail(state);
  return email ? getContactsById(state.contacts).get(email.contactId) : undefined;
}

export function selectAvailableContacts(state: GameState): number {
  return getAvailableContactCount(state.contacts);
}

export function selectContactsAwaitingEmail(state: GameState): number {
  return getContactsAwaitingEmailCount(state.contacts);
}

export function selectAvailableEventMembers(state: GameState): number {
  const assignedMembers = getRunningAcquisitionEvents(state.acquisitionEvents)
    .reduce((total, event) => total + event.membersUsed, 0);
  return Math.max(0, state.school.activeMembers - assignedMembers);
}

export function selectBusyInstructorIds(state: GameState): Set<string> {
  const busy = new Set<string>();
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
    1 +
      (state.upgrades["promiscuous-instructor"] ?? 0) +
      (state.upgrades["tiamat-instructor"] ?? 0),
  );
}

export function selectInstructorTeachingCount(state: GameState, instructorId: string): number {
  return getInstructorTeachingCounts(state.contacts, state.collaborators).get(instructorId) ?? 0;
}

export function canInstructorTeachForm(
  state: GameState,
  instructorId: string,
  formId: FormId,
): boolean {
  const instructor = getCollaboratorsById(state.collaborators).get(instructorId);
  return Boolean(
    instructor &&
    instructor.assignment === "instructor" &&
    instructor.autoTeachingEnabled !== false &&
    instructor.forms.includes(formId) &&
    (!isInstructorForm(formId) || instructor.instructorForms.includes(formId)),
  );
}

export function selectAvailableInstructor(
  state: GameState,
  formId: FormId,
  studentId?: string,
) {
  const busyInstructorIds = selectBusyInstructorIds(state);
  return state.collaborators.find((collaborator) =>
    collaborator.id !== studentId &&
    canInstructorTeachForm(state, collaborator.id, formId) &&
    !busyInstructorIds.has(collaborator.id)
  );
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
  const completedToday = getCompletedTrialsByStartDay(state.scheduledTrials).get(startOfDay) ?? [];

  return [...getScheduledTrialsByStart(state.scheduledTrials), ...completedToday]
    .sort((left, right) => left.startsAt - right.startsAt);
}

export function selectIncomePerMonth(state: GameState): number {
  const networkMultiplier = 1 + state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  return (
    (getMonthlyMemberFees(state) +
      state.network.schools.length * GAME_CONFIG.networkIncomePerSchool) *
    (1 + getUpgradeEffectTotal(state.upgrades, "incomeMultiplier")) *
    networkMultiplier
  );
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
