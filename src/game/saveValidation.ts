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
import type { CollaboratorMasteryRole, GameState, ReptileSector } from "./types";
import {
  LIGHT_INFLATION_CAUSES,
  LIGHT_INFLATION_EVENT_VISIBILITY_MS,
} from "./lightInflation";
import { isValidGadgetMastery, isValidGadgetState } from "./gadgetState";
import { REPUTATION_UPGRADE_IDS } from "./reputation";

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

const TOURNAMENT_LEVELS = new Set([
  "school",
  "academy",
  "national",
  "champions",
  "chronicles",
]);

function hasValidTournamentHall(state: Partial<GameState>): boolean {
  const hall = state.tournaments?.hall;
  return Array.isArray(hall) && hall.every((entry) => {
    const arenaWinner = entry?.arenaWinner;
    const styleWinner = entry?.styleWinner;
    return Boolean(
      entry &&
      TOURNAMENT_LEVELS.has(entry.level) &&
      Number.isSafeInteger(entry.season) &&
      entry.season >= 1 &&
      (arenaWinner === undefined || (typeof arenaWinner === "string" && arenaWinner.trim())) &&
      (styleWinner === undefined || (typeof styleWinner === "string" && styleWinner.trim())) &&
      (arenaWinner !== undefined || styleWinner !== undefined),
    );
  });
}

const REQUIRED_COLLABORATOR_MASTERY_ROLES = [
  "writing",
  "events",
  "equipment",
  "instructor",
] as const;

function hasValidCollaboratorMastery(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const mastery = value as Record<string, unknown>;
  return (
    !("lessons" in mastery) &&
    REQUIRED_COLLABORATOR_MASTERY_ROLES.every((role) =>
      Number.isFinite(mastery[role]) && (mastery[role] as number) >= 0
    ) &&
    (
      mastery.gadget === undefined ||
      (Number.isFinite(mastery.gadget) && (mastery.gadget as number) >= 0)
    )
  );
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

function hasValidEventCooldowns(state: Partial<GameState>): boolean {
  const cooldowns = state.activities?.eventCooldowns;
  if (!cooldowns || typeof cooldowns !== "object") return false;
  return Object.values(cooldowns).every((cooldown) => {
    if (!cooldown) return true;
    return cooldown.kind === "realtime"
      ? Number.isFinite(cooldown.startedAt) &&
          Number.isFinite(cooldown.availableAt) &&
          cooldown.availableAt >= cooldown.startedAt
      : cooldown.kind === "calendar" &&
          Number.isFinite(cooldown.startedMonthPosition) &&
          Number.isSafeInteger(cooldown.availableAtMonth) &&
          cooldown.availableAtMonth >= cooldown.startedMonthPosition;
  });
}

function hasValidNetworkMap(state: Partial<GameState>): boolean {
  const network = state.network;
  return Boolean(
    network &&
    Array.isArray(network.schools) &&
    network.schools.length <= GAME_CONFIG.networkMapSchoolsLimit &&
    network.schools.every((school) =>
      typeof school?.name === "string" &&
      typeof school.city === "string" &&
      (school.fame === undefined || (Number.isFinite(school.fame) && school.fame >= 0))
    ) &&
    Number.isSafeInteger(network.schoolCount) && network.schoolCount >= network.schools.length &&
    Number.isFinite(network.monthlyRent) && network.monthlyRent >= 0,
  );
}

function hasValidReputationUpgrades(state: Partial<GameState>): boolean {
  const upgrades = state.network?.reputationUpgrades;
  if (upgrades === undefined) return true;
  if (!upgrades || typeof upgrades !== "object") return false;
  return Object.entries(upgrades).every(([id, level]) =>
    (REPUTATION_UPGRADE_IDS as readonly string[]).includes(id) &&
    Number.isSafeInteger(level) &&
    (level as number) >= 0 &&
    (level as number) <= GAME_CONFIG.reputationUpgradeMaxLevel
  );
}

function hasValidLightInflation(state: Partial<GameState>): boolean {
  const inflation = state.lightInflation;
  return Boolean(
    inflation &&
    Number.isSafeInteger(inflation.increases) && inflation.increases >= 0 &&
    Number.isSafeInteger(inflation.purchasedSwords) && inflation.purchasedSwords >= 0 &&
    Number.isSafeInteger(inflation.swordsBeforePurchases) && inflation.swordsBeforePurchases >= 0 &&
    Number.isFinite(inflation.eurosEarnedAtCheck) && inflation.eurosEarnedAtCheck >= 0 &&
    Number.isFinite(inflation.priceMultiplier) && inflation.priceMultiplier >= 1 &&
    (inflation.lastCheckedJanuaryMonth === undefined ||
      (Number.isSafeInteger(inflation.lastCheckedJanuaryMonth) &&
        inflation.lastCheckedJanuaryMonth >= 1)) &&
    (inflation.event === undefined ||
      (LIGHT_INFLATION_CAUSES.includes(
        inflation.event.cause as typeof LIGHT_INFLATION_CAUSES[number],
      ) &&
        Number.isFinite(inflation.event.increase) &&
        inflation.event.increase > 0 && inflation.event.increase <= 1 &&
        Number.isFinite(inflation.event.occurredAt) &&
        Number.isFinite(inflation.event.visibleUntil) &&
        // These fields are absolute wall-clock timestamps; only their fixed duration is validated.
        inflation.event.visibleUntil - inflation.event.occurredAt ===
          LIGHT_INFLATION_EVENT_VISIBILITY_MS))
  );
}

function hasValidTraining(training: GameState["contacts"][number]["training"]): boolean {
  if (!training) return true;
  return (
    Number.isFinite(training.startedAt) &&
    Number.isFinite(training.completesAt) &&
    (training.status === undefined ||
      training.status === "running" ||
      training.status === "waitingForEquipment") &&
    (training.equipmentUsed === undefined || isNonNegativeSafeInteger(training.equipmentUsed)) &&
    (training.agonistCourseGrantsStats === undefined ||
      typeof training.agonistCourseGrantsStats === "boolean") &&
    (training.technicianId === undefined || typeof training.technicianId === "string") &&
    (training.trainingTrack === undefined ||
      training.trainingTrack === "athlete" ||
      training.trainingTrack === "combined-instructor" ||
      training.trainingTrack === "instructor" ||
      training.trainingTrack === "technician" ||
      training.trainingTrack === "agonist") &&
    (training.trainingPhase === undefined ||
      training.trainingPhase === "athlete" ||
      training.trainingPhase === "instructor" ||
      training.trainingPhase === "technician" ||
      training.trainingPhase === "agonist") &&
    (training.trainingBaseDurationMs === undefined || (
      Number.isFinite(training.trainingBaseDurationMs) &&
      training.trainingBaseDurationMs > 0
    )) &&
    (training.trainingDurationMultiplier === undefined || (
      Number.isFinite(training.trainingDurationMultiplier) &&
      training.trainingDurationMultiplier > 0
    )) &&
    (training.instructorTrainingDurationMultiplier === undefined || (
      Number.isFinite(training.instructorTrainingDurationMultiplier) &&
      training.instructorTrainingDurationMultiplier > 0
    )) &&
    (training.examFailures === undefined || isNonNegativeSafeInteger(training.examFailures)) &&
    (training.wearPerSword === undefined || (
      Number.isFinite(training.wearPerSword) && training.wearPerSword >= 0
    ))
  );
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

function hasValidCollaboratorManagement(state: Partial<GameState>): boolean {
  const management = state.collaboratorManagement;
  const gadgetTarget = management?.targets?.gadget;
  const priorities = management?.operationalPriorities;
  const fallbackAssignments = management?.fallbackAssignments;
  const validFallbackAssignments = fallbackAssignments === undefined || (
    typeof fallbackAssignments === "object" &&
    Object.entries(fallbackAssignments).every(([source, target]) =>
      COLLABORATOR_MASTERY_ROLES.includes(source as CollaboratorMasteryRole) &&
      COLLABORATOR_MASTERY_ROLES.includes(target as CollaboratorMasteryRole) &&
      source !== target
    )
  );
  return Boolean(
    management &&
    typeof management.aggregateViewUnlocked === "boolean" &&
    REQUIRED_COLLABORATOR_MASTERY_ROLES.every((role) =>
      isNonNegativeSafeInteger(management.targets?.[role])
    ) &&
    (gadgetTarget === undefined || isNonNegativeSafeInteger(gadgetTarget)) &&
    Array.isArray(priorities) &&
    priorities.length === COLLABORATOR_MASTERY_ROLES.length &&
    new Set(priorities).size === priorities.length &&
    priorities.every((role) => COLLABORATOR_MASTERY_ROLES.includes(role)) &&
    validFallbackAssignments &&
    (management.automaticShares === undefined || (
      typeof management.automaticShares === "object" &&
      Object.entries(management.automaticShares).every(([role, share]) =>
        COLLABORATOR_MASTERY_ROLES.includes(role as CollaboratorMasteryRole) &&
        isNonNegativeSafeInteger(share)
      )
    )) &&
    (management.automaticPendingMoves === undefined || (
      typeof management.automaticPendingMoves === "object" &&
      management.automaticPendingMoves !== null &&
      Object.values(management.automaticPendingMoves).every((role) =>
        COLLABORATOR_MASTERY_ROLES.includes(role)
      )
    ))
  );
}

const REPTILE_SECTORS: readonly ReptileSector[] = [
  "social",
  "events",
  "equipment",
  "instructors",
  "gadget",
];

function hasValidReptileProgress(state: Partial<GameState>): boolean {
  const reptile = state.tournaments?.reptile;
  if (!reptile) return false;
  if (
    typeof reptile.unlocked !== "boolean" ||
    !isNonNegativeSafeInteger(reptile.fameXp) || reptile.fameXp > 3_000 ||
    !isNonNegativeSafeInteger(reptile.victories) ||
    (reptile.lastTournamentMonth !== undefined && !isNonNegativeSafeInteger(reptile.lastTournamentMonth)) ||
    (reptile.unseenRecap !== undefined && typeof reptile.unseenRecap !== "boolean") ||
    !Array.isArray(reptile.hall)
  ) return false;
  const edition = reptile.activeEdition;
  if (!edition) return true;
  const bars = edition.bars && typeof edition.bars === "object" ? Object.entries(edition.bars) : [];
  const validBars = bars.length > 0 && bars.every(([sector, bar]) =>
    REPTILE_SECTORS.includes(sector as ReptileSector) &&
    Boolean(bar) &&
    Number.isFinite(bar!.progress) && bar!.progress >= 0 &&
    Number.isFinite(bar!.required) && bar!.required > 0 &&
    (bar!.completedAfterMs === undefined ||
      (Number.isFinite(bar!.completedAfterMs) && bar!.completedAfterMs > 0))
  );
  const minigame = edition.minigame;
  const validMinigame = Boolean(minigame) &&
    ["ready", "running", "completed"].includes(minigame.status) &&
    Number.isFinite(minigame.score) && minigame.score >= 0 &&
    Number.isFinite(minigame.available) && minigame.available >= 0 &&
    Number.isFinite(minigame.bonusPercent) &&
    minigame.bonusPercent >= 0 && minigame.bonusPercent <= GAME_CONFIG.reptileMinigameMaxBonusPercent;
  return validBars && validMinigame &&
    Number.isFinite(edition.organizedAt) && Number.isFinite(edition.lastProgressAt) &&
    Number.isFinite(edition.elapsedMs) && edition.elapsedMs >= 0 &&
    isNonNegativeSafeInteger(edition.organizedMonth) &&
    Number.isSafeInteger(edition.teamCount) && edition.teamCount >= 16 && edition.teamCount <= 512;
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
      (contact.trialRetryUsed === undefined || typeof contact.trialRetryUsed === "boolean") &&
      (contact.lastAgonistCourseYear === undefined ||
        (Number.isSafeInteger(contact.lastAgonistCourseYear) && contact.lastAgonistCourseYear >= 1)) &&
      (contact.agonistCourseCompletions === undefined ||
        isNonNegativeSafeInteger(contact.agonistCourseCompletions)) &&
      (contact.agonistCourseArenaBonus === undefined ||
        isNonNegativeSafeInteger(contact.agonistCourseArenaBonus)) &&
      (contact.agonistCourseStyleBonus === undefined ||
        isNonNegativeSafeInteger(contact.agonistCourseStyleBonus)) &&
      hasValidTraining(contact.training)
    ) &&
    (state.availableContactPool === undefined ||
      (Array.isArray(state.availableContactPool) &&
        state.availableContactPool.every((entry) =>
          CONTACT_SOURCES.includes(entry.source) &&
          (entry.rarity === "common" || entry.rarity === "rare" || entry.rarity === "ultra-rare") &&
          Number.isSafeInteger(entry.count) && entry.count > 0
        ))) &&
    (state.memberGroups === undefined ||
      (Array.isArray(state.memberGroups) &&
        state.memberGroups.every((group) =>
          CONTACT_SOURCES.includes(group.source) &&
          (group.rarity === "common" || group.rarity === "rare" || group.rarity === "ultra-rare") &&
          isUniqueFormIdList(group.forms) &&
          (group.recentEnrolledMonth === undefined || Number.isSafeInteger(group.recentEnrolledMonth)) &&
          (group.lastFormTrainingYear === undefined || Number.isSafeInteger(group.lastFormTrainingYear)) &&
          (group.formTrainingYearCount === undefined ||
            isNonNegativeSafeInteger(group.formTrainingYearCount)) &&
          Number.isSafeInteger(group.count) && group.count > 0
        ))) &&
    Array.isArray(state.emails) &&
    state.emails.every((email) =>
      Number.isInteger(email.presentationLevel) &&
      email.presentationLevel >= 0 &&
      email.presentationLevel <= 7
    ) &&
    Array.isArray(state.acquisitionEvents) &&
    state.acquisitionEvents.every((event) => typeof event.membersUsed === "number") &&
    Array.isArray(state.scheduledTrials) &&
    state.scheduledTrials.every((trial) =>
      (trial.status === "scheduled" ||
        trial.status === "completed" ||
        trial.status === "cancelled") &&
      (trial.equipmentUsed === undefined || isNonNegativeSafeInteger(trial.equipmentUsed)) &&
      (trial.cancellationReason === undefined || trial.cancellationReason === "equipment")
    ) &&
    hasValidEventCooldowns(state) &&
    typeof state.upgrades?.["comfortable-keyboard"] === "number" &&
    typeof state.statistics?.peopleMet === "number" &&
    typeof state.statistics?.demonstrationsGiven === "number" &&
    typeof state.statistics?.maintenanceCompleted === "number" &&
    isNonNegativeSafeInteger(state.school?.activeMembers) &&
    isNonNegativeSafeInteger(state.school?.peakActiveMembers) &&
    isNonNegativeSafeInteger(state.school?.fame) &&
    isNonNegativeSafeInteger(state.school?.followers) &&
    typeof state.equipment?.totalSwords === "number" &&
    typeof state.equipment?.availableSwords === "number" &&
    typeof state.equipment?.damagedSwords === "number" &&
    typeof state.equipment?.wear === "number" &&
    isNonNegativeSafeInteger(state.equipment?.totalSwords) &&
    isNonNegativeSafeInteger(state.equipment?.availableSwords) &&
    isNonNegativeSafeInteger(state.equipment?.damagedSwords) &&
    state.equipment.availableSwords + state.equipment.damagedSwords <=
      state.equipment.totalSwords &&
    Number.isFinite(state.equipment.wear) &&
    state.equipment.wear >= 0 &&
    isNonNegativeSafeInteger(state.legendaryPity) &&
    Array.isArray(state.legendaryCollaborators?.encounteredProfileIds) &&
    Array.isArray(state.legendaryCollaborators?.enrolledProfileIds) &&
    typeof state.legendaryCollaborators?.enrollmentAttempts === "object" &&
    typeof state.legendaryCollaborators?.retainedProgress === "object" &&
    Object.values(state.legendaryCollaborators?.enrollmentCounts ?? {}).every(isNonNegativeSafeInteger) &&
    Object.values(state.legendaryCollaborators?.retainedProgress ?? {}).every((progress) =>
      Boolean(
        progress &&
        isUniqueFormIdList(progress.forms) &&
        isUniqueFormIdList(progress.instructorForms) &&
        isUniqueFormIdList(progress.technicianForms ?? []) &&
        (progress.technicianForms ?? []).every((formId) =>
          progress.forms.includes(formId) && progress.instructorForms.includes(formId)
        ) &&
        (progress.agonistCourseArenaBonus === undefined ||
          isNonNegativeSafeInteger(progress.agonistCourseArenaBonus)) &&
        (progress.agonistCourseStyleBonus === undefined ||
          isNonNegativeSafeInteger(progress.agonistCourseStyleBonus)) &&
        (progress.mastery === undefined || hasValidCollaboratorMastery(progress.mastery)),
      )
    ) &&
    Array.isArray(state.collaborators) &&
    state.collaborators.every((collaborator) =>
      (collaborator.rarity === "ultra-rare" || collaborator.rarity === "legendary") &&
      (
        collaborator.assignment === null ||
        COLLABORATOR_MASTERY_ROLES.includes(collaborator.assignment)
      ) &&
      (
        collaborator.secondaryAssignment === undefined ||
        collaborator.secondaryAssignment === null ||
        COLLABORATOR_MASTERY_ROLES.includes(collaborator.secondaryAssignment)
      ) &&
      isUniqueFormIdList(collaborator.forms) &&
      isUniqueFormIdList(collaborator.instructorForms) &&
      isUniqueFormIdList(collaborator.technicianForms ?? []) &&
      (collaborator.technicianForms ?? []).every((formId) =>
        collaborator.forms.includes(formId) && collaborator.instructorForms.includes(formId)
      ) &&
      (collaborator.technicianCourseReservation === undefined || (
        isUniqueFormIdList([collaborator.technicianCourseReservation.formId]) &&
        collaborator.forms.includes(collaborator.technicianCourseReservation.formId) &&
        collaborator.instructorForms.includes(collaborator.technicianCourseReservation.formId) &&
        !(collaborator.technicianForms ?? []).includes(
          collaborator.technicianCourseReservation.formId,
        ) &&
        Number.isFinite(collaborator.technicianCourseReservation.bookedAt) &&
        Number.isSafeInteger(collaborator.technicianCourseReservation.eligibleMonth) &&
        collaborator.technicianCourseReservation.eligibleMonth >= 1
      )) &&
      Array.isArray(collaborator.formBranchPreferences) &&
      (collaborator.lastAgonistCourseYear === undefined ||
        (Number.isSafeInteger(collaborator.lastAgonistCourseYear) &&
          collaborator.lastAgonistCourseYear >= 1)) &&
      !("autoTeachingEnabled" in collaborator) &&
      hasValidCollaboratorMastery(collaborator.mastery) &&
      hasValidTraining(collaborator.training)
    ) &&
    hasValidCollaboratorManagement(state) &&
    hasValidLegendaryAssignments(state) &&
    typeof state.upgrades?.["instructor-versatility"] === "number" &&
    typeof state.upgrades?.["technical-arena"] === "number" &&
    typeof state.upgrades?.["sis-accreditation"] === "number" &&
    typeof state.upgrades?.["cost-of-service"] === "number" &&
    typeof state.upgrades?.["agonist-course-intensity"] === "number" &&
    typeof state.upgrades?.["athletic-preparation"] === "number" &&
    typeof state.upgrades?.["promiscuous-instructor"] === "number" &&
    typeof state.upgrades?.["tiamat-instructor"] === "number" &&
    typeof state.upgrades?.["extra-form"] === "number" &&
    typeof state.upgrades?.pagosport === "number" &&
    typeof state.upgrades?.["divine-touch"] === "number" &&
    typeof state.upgrades?.["project-x"] === "number" &&
    typeof state.upgrades?.["social-content-synthesis"] === "number" &&
    typeof state.upgrades?.["social-editorial-plan"] === "number" &&
    typeof state.upgrades?.["social-content-distribution"] === "number" &&
    typeof state.upgrades?.["social-sponsorships"] === "number" &&
    typeof state.upgrades?.["standard-procedures"] === "number" &&
    typeof state.upgrades?.["operational-priorities"] === "number" &&
    typeof state.upgrades?.["gadget-showcase"] === "number" &&
    typeof state.upgrades?.["gadget-online-store"] === "number" &&
    typeof state.upgrades?.["gadget-design-tools"] === "number" &&
    typeof state.upgrades?.["gadget-revision-lab"] === "number" &&
    typeof state.upgrades?.["gadget-order-management"] === "number" &&
    typeof state.upgrades?.["gadget-sales-training"] === "number" &&
    typeof state.upgrades?.["gadget-cross-selling"] === "number" &&
    typeof state.automation?.lastProcessedAt === "number" &&
    typeof state.automation?.autoSendEmails === "boolean" &&
    typeof state.automation?.autoTeachingEnabled === "boolean" &&
    typeof state.automation?.lessonBuffer === "number" &&
    typeof state.automation?.socialContentBuffer === "number" &&
    typeof state.automation?.equipmentPreparedWork === "number" &&
    state.automation.equipmentPreparedWork >= 0 &&
    typeof state.automation?.offlineContactBuffer === "number" &&
    (state.automation?.lastImprovedAthlete === undefined ||
      typeof state.automation.lastImprovedAthlete === "string") &&
    (state.automation?.lastImprovedAthleteId === undefined ||
      typeof state.automation.lastImprovedAthleteId === "string") &&
    typeof state.statistics?.automatedCharacters === "number" &&
    typeof state.statistics?.socialContentCycles === "number" &&
    typeof state.statistics?.socialFollowersGained === "number" &&
    typeof state.statistics?.formsCompleted === "number" &&
    typeof state.statistics?.membersDeparted === "number" &&
    typeof state.statistics?.narrativeEvents === "number" &&
    hasValidHistoryArchive(state) &&
    typeof state.unlocks?.collaborators === "boolean" &&
    typeof state.unlocks?.forms === "boolean" &&
    typeof state.unlocks?.gadget === "boolean" &&
    Array.isArray(state.secretUpgradeDiscoveries) &&
    state.secretUpgradeDiscoveries.every(
      (id) => id === "project-x" || id === "divine-touch",
    ) &&
    isValidGadgetState(state.gadgets) &&
    (state.yearDigest === undefined || (
      Number.isSafeInteger(state.yearDigest.schoolYear) &&
      Number.isSafeInteger(state.yearDigest.month) &&
      typeof state.yearDigest.start === "object" &&
      Object.values(state.yearDigest.start ?? {}).every((value) => Number.isFinite(value))
    )) &&
    Array.isArray(state.moments?.seen) &&
    state.moments.seen.every((key) => typeof key === "string") &&
    Array.isArray(state.moments?.queue) &&
    state.moments.queue.every((key) => typeof key === "string") &&
    Array.isArray(state.achievements) &&
    state.achievements.every((key) => typeof key === "string") &&
    (state.statistics?.career === undefined || Object.values(state.statistics.career)
      .every((value) => value === undefined || Number.isFinite(value))) &&
    typeof state.narrative?.nextEventAt === "number" &&
    Array.isArray(state.narrative?.history) &&
    Array.isArray(state.tutorial?.completedSceneIds) &&
    state.tutorial.completedSceneIds.every((sceneId) => typeof sceneId === "string") &&
    Array.isArray(state.tutorial?.skippedSceneIds) &&
    state.tutorial.skippedSceneIds.every((sceneId) => typeof sceneId === "string") &&
    (state.tutorial.triggeredSceneIds === undefined || (
      Array.isArray(state.tutorial.triggeredSceneIds) &&
      state.tutorial.triggeredSceneIds.every((sceneId) => typeof sceneId === "string")
    )) &&
    typeof state.shortGoal?.definitionId === "string" &&
    typeof state.shortGoal?.baseline === "number" &&
    typeof state.shortGoal?.target === "number" &&
    typeof state.shortGoal?.startedAt === "number" &&
    typeof state.shortGoal?.completedCount === "number" &&
    typeof state.shortGoal?.isActive === "boolean" &&
    (state.shortGoal.reactivationStartedAt === undefined ||
      typeof state.shortGoal.reactivationStartedAt === "number") &&
    typeof state.randomSeed === "number" &&
    hasValidLightInflation(state) &&
    typeof state.profile?.displayName === "string" &&
    Number.isFinite(state.school?.euros) &&
    typeof state.school?.currentMonth === "number" &&
    typeof state.school?.city === "string" &&
    typeof state.school?.accentColor === "string" &&
    Number.isSafeInteger(state.network?.reputation) && (state.network?.reputation ?? -1) >= 0 &&
    hasValidReputationUpgrades(state) &&
    hasValidNetworkMap(state) &&
    typeof state.network?.prestigeOfferSent === "boolean"
    && Array.isArray(state.tournaments?.results)
    && hasValidTournamentHall(state)
    && Array.isArray(state.tournaments?.missedTournaments)
    && Array.isArray(state.tournaments?.immuneContactIds)
    && Array.isArray(state.tournaments?.skippedSeasons)
    && typeof state.tournaments?.ordinaryVictoryAchieved === "boolean"
    && typeof state.tournaments?.championsVictoryCurrentSchool === "boolean"
    && hasValidChroniclesProgress(state)
    && hasValidReptileProgress(state)
    && typeof state.network?.secretLegendaries === "object"
    && isValidGadgetMastery(state.network?.gadgetMastery)
  );
}
