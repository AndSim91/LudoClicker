import { COLLABORATOR_MASTERY_ROLES } from "../content/mastery";
import { isUniqueFormIdList } from "../content/forms";
import {
  GAME_CONFIG,
  INITIAL_SAVE_COMPATIBILITY_VERSION,
} from "./config";
import {
  isCataloguedLegendaryId,
  isSecretLegendaryId,
} from "./legendaryAvailability";
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

export function getSaveCompatibilityVersion(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const compatibilityVersion = (value as {
    saveCompatibilityVersion?: unknown;
  }).saveCompatibilityVersion;
  return compatibilityVersion === undefined
    ? INITIAL_SAVE_COMPATIBILITY_VERSION
    : typeof compatibilityVersion === "number" &&
        Number.isSafeInteger(compatibilityVersion) &&
        compatibilityVersion >= 1
      ? compatibilityVersion
      : null;
}

export function isSaveCompatible(value: unknown): boolean {
  return getSaveCompatibilityVersion(value) === GAME_CONFIG.saveCompatibilityVersion;
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

function hasValidLegendaryAssignments(state: Partial<GameState>): boolean {
  if (
    !Array.isArray(state.contacts) ||
    !Array.isArray(state.collaborators) ||
    !Array.isArray(state.scheduledTrials)
  ) return false;
  const assignedProfiles = new Set<string>();
  const contactsById = new Map(state.contacts.map((contact) => [contact.id, contact]));
  for (const contact of state.contacts) {
    if (contact.rarity === "legendary") {
      if (!isCataloguedLegendaryId(contact.specialProfileId)) return false;
    } else if (contact.specialProfileId || contact.secretLegendaryId) {
      return false;
    }
    if (!contact.specialProfileId) continue;
    if (assignedProfiles.has(contact.specialProfileId)) return false;
    assignedProfiles.add(contact.specialProfileId);
    if (
      isSecretLegendaryId(contact.specialProfileId)
        ? contact.secretLegendaryId !== contact.specialProfileId
        : contact.secretLegendaryId !== undefined
    ) return false;
  }
  if (!state.collaborators.every((collaborator) => {
    if (!collaborator.specialProfileId) return collaborator.rarity !== "legendary";
    const contact = contactsById.get(collaborator.contactId);
    return collaborator.rarity === "legendary" &&
      isCataloguedLegendaryId(collaborator.specialProfileId) &&
      contact?.specialProfileId === collaborator.specialProfileId;
  })) return false;
  const activeTrialProfiles = new Set<string>();
  for (const trial of state.scheduledTrials) {
    if (trial.status !== "scheduled") continue;
    const profileId = contactsById.get(trial.contactId)?.specialProfileId;
    if (!profileId) continue;
    if (activeTrialProfiles.has(profileId)) return false;
    activeTrialProfiles.add(profileId);
  }
  return true;
}

function hasValidChroniclesProgress(state: Partial<GameState>): boolean {
  const chronicles = state.tournaments?.chronicles;
  if (
    !chronicles ||
    typeof chronicles.unlocked !== "boolean" ||
    !isNonNegativeSafeInteger(chronicles.keys)
  ) return false;
  const challenge = chronicles.activeChallenge;
  if (!challenge) return true;
  const validChoice = (choice: unknown) =>
    choice === "rock" || choice === "paper" || choice === "scissors";
  const validDiscipline = (discipline: unknown) =>
    discipline === "arena" || discipline === "style";
  return isSecretLegendaryId(challenge.legendaryId) &&
    typeof challenge.tournamentResultId === "string" &&
    validDiscipline(challenge.discipline) &&
    Array.isArray(challenge.queuedDisciplines) &&
    challenge.queuedDisciplines.every(validDiscipline) &&
    isNonNegativeSafeInteger(challenge.playerWins) && challenge.playerWins < 2 &&
    isNonNegativeSafeInteger(challenge.legendaryWins) && challenge.legendaryWins < 2 &&
    Array.isArray(challenge.hands) &&
    challenge.hands.every((hand) =>
      validChoice(hand.playerChoice) &&
      validChoice(hand.legendaryChoice) &&
      (hand.outcome === "player" || hand.outcome === "legendary" || hand.outcome === "draw")
    );
}

export function isValidGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  return (
    state.version === GAME_CONFIG.version &&
    state.saveCompatibilityVersion === GAME_CONFIG.saveCompatibilityVersion &&
    Array.isArray(state.contacts) &&
    state.contacts.every((contact) =>
      (
        contact.rarity === "common" ||
        contact.rarity === "rare" ||
        contact.rarity === "ultra-rare" ||
        contact.rarity === "legendary"
      ) &&
      isUniqueFormIdList(contact.forms) &&
      (contact.favorite === undefined || typeof contact.favorite === "boolean") &&
      (contact.lastAgonistCourseYear === undefined ||
        (Number.isSafeInteger(contact.lastAgonistCourseYear) && contact.lastAgonistCourseYear >= 1)) &&
      (contact.agonistCourseCompletions === undefined ||
        isNonNegativeSafeInteger(contact.agonistCourseCompletions)) &&
      (contact.agonistCourseArenaBonus === undefined ||
        isNonNegativeSafeInteger(contact.agonistCourseArenaBonus)) &&
      (contact.agonistCourseStyleBonus === undefined ||
        isNonNegativeSafeInteger(contact.agonistCourseStyleBonus))
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
    isNonNegativeSafeInteger(state.school?.followers) &&
    typeof state.equipment?.totalSwords === "number" &&
    typeof state.equipment?.availableSwords === "number" &&
    typeof state.equipment?.damagedSwords === "number" &&
    typeof state.equipment?.wear === "number" &&
    Array.isArray(state.legendaryCollaborators?.encounteredProfileIds) &&
    Array.isArray(state.legendaryCollaborators?.enrolledProfileIds) &&
    typeof state.legendaryCollaborators?.enrollmentAttempts === "object" &&
    typeof state.legendaryCollaborators?.retainedProgress === "object" &&
    Object.values(state.legendaryCollaborators?.retainedProgress ?? {}).every((progress) =>
      Boolean(
        progress &&
        isUniqueFormIdList(progress.forms) &&
        isUniqueFormIdList(progress.instructorForms) &&
        (progress.agonistCourseArenaBonus === undefined ||
          isNonNegativeSafeInteger(progress.agonistCourseArenaBonus)) &&
        (progress.agonistCourseStyleBonus === undefined ||
          isNonNegativeSafeInteger(progress.agonistCourseStyleBonus)) &&
        (progress.mastery === undefined || (
          typeof progress.mastery === "object" &&
          progress.mastery !== null &&
          COLLABORATOR_MASTERY_ROLES.every((role) =>
            Number.isFinite(progress.mastery?.[role]) &&
            (progress.mastery?.[role] ?? 0) >= 0
          )
        )),
      )
    ) &&
    Array.isArray(state.collaborators) &&
    state.collaborators.every((collaborator) =>
      (collaborator.rarity === "ultra-rare" || collaborator.rarity === "legendary") &&
      isUniqueFormIdList(collaborator.forms) &&
      isUniqueFormIdList(collaborator.instructorForms) &&
      Array.isArray(collaborator.formBranchPreferences) &&
      (collaborator.lastAgonistCourseYear === undefined ||
        (Number.isSafeInteger(collaborator.lastAgonistCourseYear) &&
          collaborator.lastAgonistCourseYear >= 1)) &&
      typeof collaborator.autoTeachingEnabled === "boolean" &&
      typeof collaborator.mastery === "object" &&
      collaborator.mastery !== null &&
      COLLABORATOR_MASTERY_ROLES.every((role) =>
        Number.isFinite(collaborator.mastery?.[role]) &&
        (collaborator.mastery?.[role] ?? 0) >= 0
      )
    ) &&
    hasValidLegendaryAssignments(state) &&
    typeof state.upgrades?.["instructor-versatility"] === "number" &&
    typeof state.upgrades?.["technical-arena"] === "number" &&
    typeof state.upgrades?.["agonist-course-intensity"] === "number" &&
    typeof state.upgrades?.["promiscuous-instructor"] === "number" &&
    typeof state.upgrades?.["tiamat-instructor"] === "number" &&
    typeof state.upgrades?.["extra-form"] === "number" &&
    typeof state.upgrades?.pagosport === "number" &&
    typeof state.upgrades?.["divine-touch"] === "number" &&
    typeof state.automation?.lastProcessedAt === "number" &&
    typeof state.automation?.autoSendEmails === "boolean" &&
    typeof state.automation?.lessonBuffer === "number" &&
    typeof state.automation?.offlineContactBuffer === "number" &&
    (state.automation?.lastImprovedAthlete === undefined ||
      typeof state.automation.lastImprovedAthlete === "string") &&
    (state.automation?.lastImprovedAthleteId === undefined ||
      typeof state.automation.lastImprovedAthleteId === "string") &&
    typeof state.statistics?.automatedCharacters === "number" &&
    typeof state.statistics?.socialTrials === "number" &&
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
    Array.isArray(state.tutorial?.completedSceneIds) &&
    state.tutorial.completedSceneIds.every((sceneId) => typeof sceneId === "string") &&
    Array.isArray(state.tutorial?.skippedSceneIds) &&
    state.tutorial.skippedSceneIds.every((sceneId) => typeof sceneId === "string") &&
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
    && hasValidChroniclesProgress(state)
    && typeof state.network?.secretLegendaries === "object"
  );
}
