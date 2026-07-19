import { COLLABORATOR_MASTERY_ROLES } from "../content/mastery";
import { GAME_CONFIG } from "./config";
import type { GameState } from "./types";

const CONTACT_SOURCES: GameState["contacts"][number]["source"][] = [
  "tutorial",
  "sparring",
  "event",
  "social",
  "collaborator",
  "tournament",
];

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function hasValidHistoryArchive(state: Partial<GameState>): boolean {
  const archive = state.historyArchive;
  return Boolean(
    archive &&
    CONTACT_SOURCES.every((source) => {
      const summary = archive.contactsBySource?.[source];
      return isNonNegativeSafeInteger(summary?.total) &&
        isNonNegativeSafeInteger(summary?.enrolled) &&
        summary.enrolled <= summary.total;
    }) &&
    isNonNegativeSafeInteger(archive.emails?.count) &&
    Number.isFinite(archive.emails?.totalWritingMs) &&
    archive.emails.totalWritingMs >= 0 &&
    isNonNegativeSafeInteger(archive.completedTrials) &&
    Object.values(archive.completedEventsByDefinition ?? {}).every(
      isNonNegativeSafeInteger,
    )
  );
}

export function isValidGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  return (
    state.version === GAME_CONFIG.version &&
    Array.isArray(state.contacts) &&
    state.contacts.every((contact) =>
      (
        contact.rarity === "common" ||
        contact.rarity === "rare" ||
        contact.rarity === "ultra-rare" ||
        contact.rarity === "legendary"
      ) &&
      Array.isArray(contact.forms)
    ) &&
    Array.isArray(state.emails) &&
    state.emails.every((email) =>
      Number.isInteger(email.presentationLevel) &&
      email.presentationLevel >= 0 &&
      email.presentationLevel <= 7
    ) &&
    Array.isArray(state.acquisitionEvents) &&
    state.acquisitionEvents.every((event) => typeof event.membersUsed === "number") &&
    typeof state.activities?.nextSparringAt === "number" &&
    typeof state.upgrades?.["comfortable-keyboard"] === "number" &&
    typeof state.statistics?.peopleMet === "number" &&
    typeof state.statistics?.demonstrationsGiven === "number" &&
    typeof state.statistics?.maintenanceCompleted === "number" &&
    isNonNegativeSafeInteger(state.school?.activeMembers) &&
    isNonNegativeSafeInteger(state.school?.peakActiveMembers) &&
    isNonNegativeSafeInteger(state.school?.historicMembers) &&
    typeof state.equipment?.totalSwords === "number" &&
    typeof state.equipment?.availableSwords === "number" &&
    typeof state.equipment?.damagedSwords === "number" &&
    typeof state.equipment?.wear === "number" &&
    Array.isArray(state.legendaryCollaborators?.encounteredProfileIds) &&
    Array.isArray(state.legendaryCollaborators?.enrolledProfileIds) &&
    typeof state.legendaryCollaborators?.enrollmentAttempts === "object" &&
    typeof state.legendaryCollaborators?.retainedProgress === "object" &&
    Array.isArray(state.collaborators) &&
    state.collaborators.every((collaborator) =>
      (collaborator.rarity === "ultra-rare" || collaborator.rarity === "legendary") &&
      Array.isArray(collaborator.forms) &&
      Array.isArray(collaborator.instructorForms) &&
      Array.isArray(collaborator.formBranchPreferences) &&
      typeof collaborator.autoTeachingEnabled === "boolean" &&
      typeof collaborator.mastery === "object" &&
      collaborator.mastery !== null &&
      COLLABORATOR_MASTERY_ROLES.every((role) =>
        Number.isFinite(collaborator.mastery?.[role]) &&
        (collaborator.mastery?.[role] ?? 0) >= 0
      )
    ) &&
    typeof state.upgrades?.["instructor-versatility"] === "number" &&
    typeof state.upgrades?.["tiamat-instructor"] === "number" &&
    typeof state.upgrades?.["extra-form"] === "number" &&
    typeof state.automation?.lastProcessedAt === "number" &&
    typeof state.automation?.offlineContactBuffer === "number" &&
    typeof state.statistics?.automatedCharacters === "number" &&
    typeof state.statistics?.socialCampaigns === "number" &&
    typeof state.statistics?.formsCompleted === "number" &&
    typeof state.statistics?.membersDeparted === "number" &&
    typeof state.statistics?.narrativeEvents === "number" &&
    hasValidHistoryArchive(state) &&
    typeof state.unlocks?.collaborators === "boolean" &&
    typeof state.unlocks?.forms === "boolean" &&
    Array.isArray(state.achievements) &&
    typeof state.narrative?.nextEventAt === "number" &&
    Array.isArray(state.narrative?.history) &&
    typeof state.shortGoal?.definitionId === "string" &&
    typeof state.shortGoal?.baseline === "number" &&
    typeof state.shortGoal?.target === "number" &&
    typeof state.shortGoal?.startedAt === "number" &&
    typeof state.shortGoal?.completedCount === "number" &&
    typeof state.randomSeed === "number" &&
    typeof state.profile?.displayName === "string" &&
    Number.isFinite(state.school?.euros) &&
    (state.school?.euros ?? -1) >= 0 &&
    typeof state.school?.currentMonth === "number" &&
    typeof state.school?.city === "string" &&
    typeof state.school?.accentColor === "string" &&
    typeof state.network?.reputation === "number" &&
    Array.isArray(state.network?.schools) &&
    typeof state.network?.prestigeOfferSent === "boolean"
    && Array.isArray(state.tournaments?.results)
    && Array.isArray(state.tournaments?.missedTournaments)
    && Array.isArray(state.tournaments?.immuneContactIds)
    && Array.isArray(state.tournaments?.skippedSeasons)
    && typeof state.tournaments?.championsVictoryCurrentSchool === "boolean"
    && typeof state.network?.secretLegendaries === "object"
  );
}
