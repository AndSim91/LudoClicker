import { GAME_CONFIG, INITIAL_SAVE_COMPATIBILITY_VERSION } from "./config";
import { compactGameHistory } from "./historyArchive";
import { migrateContentState } from "./saveMigrations/content";
import { migrateCoreState } from "./saveMigrations/core";
import { normalizeLegacySave } from "./saveMigrations/normalize";
import { migratePeopleState } from "./saveMigrations/people";
import { migrateProgressionState } from "./saveMigrations/progression";
import { migrateScalabilityState } from "./saveMigrations/scalability";
import { migrateTournamentState } from "./saveMigrations/tournaments";
import { migrateTrainingState } from "./saveMigrations/training";
import { migrateChroniclesState } from "./saveMigrations/chronicles";
import { migrateTutorialState } from "./saveMigrations/tutorial";
import { migrateAgonistCourseState } from "./saveMigrations/agonistCourse";
import { migrateEmailAutomationState } from "./saveMigrations/emailAutomation";
import { migrateEquipmentLoadState } from "./saveMigrations/equipmentLoad";
import { migrateSocialRevampState } from "./saveMigrations/socialRevamp";
import { migratePityState } from "./saveMigrations/pity";
import { migrateCollaboratorManagementState } from "./saveMigrations/collaboratorManagement";
import { migrateEventCooldownState } from "./saveMigrations/eventCooldowns";
import { migrateCollaboratorOperationsState } from "./saveMigrations/collaboratorOperations";
import { migrateTeacherTrainingState } from "./saveMigrations/teacherTraining";
import { migrateCollaboratorPresetsState } from "./saveMigrations/collaboratorPresets";
import { migrateSISAccreditationState } from "./saveMigrations/sisAccreditation";
import { migrateSecretLegendaryDifficultyState } from "./saveMigrations/secretLegendaryDifficulty";
import { migrateProjectXState } from "./saveMigrations/projectX";
import { migrateSocialAudienceState } from "./saveMigrations/socialAudience";
import { migrateSecretLegendaryAppearanceState } from "./saveMigrations/secretLegendaryAppearances";
import { migrateLightInflationState } from "./saveMigrations/lightInflation";
import { migrateLightInflationVisibilityState } from "./saveMigrations/lightInflationVisibility";
import { migrateFameState } from "./saveMigrations/fame";
import { migrateGadgetState } from "./saveMigrations/gadgets";
import { migrateTournamentStandardDifficultyState } from "./saveMigrations/tournamentStandardDifficulty";
import { migrateGadgetRarityState } from "./saveMigrations/gadgetRarities";
import { migrateSecretLegendaryCircuitBoostRemovalState } from "./saveMigrations/secretLegendaryCircuitBoostRemoval";
import { migrateSecretLegendaryBaseRebalanceState } from "./saveMigrations/secretLegendaryBaseRebalance";
import { migrateUpgradeRevampState } from "./saveMigrations/upgradeRevamp";
import { migrateReptileState } from "./saveMigrations/reptile";
import { migrateFirstCollaboratorTutorialState } from "./saveMigrations/firstCollaboratorTutorial";
import { migrateAthleticPreparationMergeState } from "./saveMigrations/athleticPreparationMerge";
import { migrateAgonistCourseProgressionState } from "./saveMigrations/agonistCourseProgression";
import { migrateShortGoalAvailabilityState } from "./saveMigrations/shortGoalAvailability";
import { migrateLegendaryEmailState } from "./saveMigrations/legendaryEmails";
import { migrateGadgetExtraSalesState } from "./saveMigrations/gadgetExtraSales";
import { migrateGadgetMonthlyRevenueState } from "./saveMigrations/gadgetMonthlyRevenue";
import type { MigratableState, SaveMigrationStage } from "./saveMigrations/types";
import type { GameState } from "./types";

const SAVE_MIGRATION_STAGES: SaveMigrationStage[] = [
  migrateCoreState,
  migratePeopleState,
  migrateProgressionState,
  migrateContentState,
  migrateScalabilityState,
  migrateTournamentState,
  migrateTrainingState,
  migrateChroniclesState,
  migrateTutorialState,
  migrateAgonistCourseState,
  migrateEmailAutomationState,
  migrateEquipmentLoadState,
  migrateSocialRevampState,
  migratePityState,
  migrateCollaboratorManagementState,
  migrateEventCooldownState,
  migrateCollaboratorOperationsState,
  migrateTeacherTrainingState,
  migrateCollaboratorPresetsState,
  migrateSISAccreditationState,
  migrateSecretLegendaryDifficultyState,
  migrateProjectXState,
  migrateSocialAudienceState,
  migrateSecretLegendaryAppearanceState,
  migrateLightInflationState,
  migrateLightInflationVisibilityState,
  migrateFameState,
  migrateGadgetState,
  migrateTournamentStandardDifficultyState,
  migrateGadgetRarityState,
  migrateSecretLegendaryCircuitBoostRemovalState,
  migrateSecretLegendaryBaseRebalanceState,
  migrateUpgradeRevampState,
  migrateReptileState,
  migrateFirstCollaboratorTutorialState,
  migrateAthleticPreparationMergeState,
  migrateAgonistCourseProgressionState,
  migrateShortGoalAvailabilityState,
  migrateLegendaryEmailState,
  migrateGadgetExtraSalesState,
  migrateGadgetMonthlyRevenueState,
];

function canCompactHistory(state: MigratableState): boolean {
  return state.version === GAME_CONFIG.version &&
    Array.isArray(state.contacts) &&
    Array.isArray(state.emails) &&
    Array.isArray(state.pendingEmailOutcomes) &&
    Array.isArray(state.scheduledTrials) &&
    Array.isArray(state.acquisitionEvents) &&
    Array.isArray(state.collaborators) &&
    Boolean(state.historyArchive?.contactsBySource) &&
    Boolean(state.historyArchive?.emails) &&
    Boolean(state.historyArchive?.completedEventsByDefinition);
}

export function migrate(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const migrated = SAVE_MIGRATION_STAGES.reduce(
    (state, migrationStage) => migrationStage(state),
    value as MigratableState,
  );
  const normalized = normalizeLegacySave(migrated);
  // Saves created before the compatibility gate are part of the first
  // compatibility family and can continue through the explicit migrations.
  const compatible = normalized.saveCompatibilityVersion === undefined
    ? {
        ...normalized,
        saveCompatibilityVersion: INITIAL_SAVE_COMPATIBILITY_VERSION,
      }
    : normalized;
  return canCompactHistory(compatible)
    ? compactGameHistory(compatible as GameState)
    : compatible;
}
