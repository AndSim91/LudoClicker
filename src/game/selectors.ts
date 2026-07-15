import type { CampaignEmail, Contact, FormId, GameState, ScheduledTrial } from "./types";
import { GAME_CONFIG } from "./config";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { isInstructorForm } from "../content/forms";

export function selectActiveEmail(state: GameState): CampaignEmail | undefined {
  return state.emails.find((email) => email.status === "writing" || email.status === "sending");
}

export function selectActiveContact(state: GameState): Contact | undefined {
  const email = selectActiveEmail(state);
  return email ? state.contacts.find((contact) => contact.id === email.contactId) : undefined;
}

export function selectAvailableContacts(state: GameState): number {
  return state.contacts.filter((contact) => contact.status === "available").length;
}

export function selectAvailableEventMembers(state: GameState): number {
  const assignedMembers = state.acquisitionEvents
    .filter((event) => event.status === "running")
    .reduce((total, event) => total + event.membersUsed, 0);
  return Math.max(0, state.school.activeMembers - assignedMembers);
}

export function selectBusyInstructorIds(state: GameState): Set<string> {
  const busy = new Set<string>();
  for (const collaborator of state.collaborators) {
    if (collaborator.training) busy.add(collaborator.id);
    if (selectInstructorTeachingCount(state, collaborator.id) >= selectInstructorCapacity(state)) {
      busy.add(collaborator.id);
    }
  }
  return busy;
}

export function selectInstructorCapacity(state: GameState): number {
  return Math.min(6, 1 + (state.upgrades["tiamat-instructor"] ?? 0));
}

export function selectInstructorTeachingCount(state: GameState, instructorId: string): number {
  const contactTrainings = state.contacts.filter(
    (contact) => contact.training?.instructorId === instructorId,
  ).length;
  const collaboratorTrainings = state.collaborators.filter(
    (collaborator) => collaborator.training?.instructorId === instructorId,
  ).length;
  return contactTrainings + collaboratorTrainings;
}

export function canInstructorTeachForm(
  state: GameState,
  instructorId: string,
  formId: FormId,
): boolean {
  const instructor = state.collaborators.find((candidate) => candidate.id === instructorId);
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
  return state.scheduledTrials
    .filter((trial) => trial.status === "scheduled")
    .slice()
    .sort((a, b) => a.startsAt - b.startsAt);
}

export function selectDayTrials(state: GameState, now: number): ScheduledTrial[] {
  const today = new Date(now);
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  ).getTime();

  return state.scheduledTrials
    .filter(
      (trial) =>
        trial.status === "scheduled" ||
        (trial.startsAt >= startOfDay && trial.startsAt < endOfDay),
    )
    .slice()
    .sort((a, b) => a.startsAt - b.startsAt);
}

export function selectEmailProgress(email: CampaignEmail | undefined): number {
  if (!email || email.body.length === 0) return 0;
  return Math.min(100, Math.round((email.revealedCharacters / email.body.length) * 100));
}

export function selectIncomePerMonth(state: GameState): number {
  const networkMultiplier = 1 + state.network.schools.length * GAME_CONFIG.prestigeBonusPerSchool;
  return (
    (state.school.activeMembers * GAME_CONFIG.monthlyMemberFee +
      state.network.schools.length * GAME_CONFIG.networkIncomePerSchool) *
    (1 + getUpgradeEffectTotal(state.upgrades, "incomeMultiplier")) *
    networkMultiplier
  );
}

export function selectUnreadMessages(state: GameState): number {
  return state.messages.reduce((total, message) => total + (message.unread ? 1 : 0), 0);
}

export type SentEmailStatus = "In attesa" | "Prova in palestra" | "Iscritto" | "Perso";

export function selectSentEmailStatus(
  state: GameState,
  email: CampaignEmail,
): SentEmailStatus {
  const contact = state.contacts.find((candidate) => candidate.id === email.contactId);
  if (contact?.status === "enrolled") return "Iscritto";
  if (contact?.status === "lost" || email.status === "lost") return "Perso";
  if (contact?.status === "trialScheduled" || email.status === "trialBooked") {
    return "Prova in palestra";
  }
  return "In attesa";
}
