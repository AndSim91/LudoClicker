import type { CampaignEmail, Contact, GameState, ScheduledTrial } from "./types";
import { GAME_CONFIG } from "./config";
import { getUpgradeEffectTotal } from "../content/upgrades";

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

export function selectUpcomingTrials(state: GameState): ScheduledTrial[] {
  return state.scheduledTrials
    .filter((trial) => trial.status === "scheduled")
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
