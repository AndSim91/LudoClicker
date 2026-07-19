import { migrateContentState } from "./saveMigrations/content";
import { migrateCoreState } from "./saveMigrations/core";
import { normalizeLegacySave } from "./saveMigrations/normalize";
import { migratePeopleState } from "./saveMigrations/people";
import { migrateProgressionState } from "./saveMigrations/progression";
import { migrateScalabilityState } from "./saveMigrations/scalability";
import { migrateTournamentState } from "./saveMigrations/tournaments";
import { migrateTrainingState } from "./saveMigrations/training";
import type { MigratableState, SaveMigrationStage } from "./saveMigrations/types";

const SAVE_MIGRATION_STAGES: SaveMigrationStage[] = [
  migrateCoreState,
  migratePeopleState,
  migrateProgressionState,
  migrateContentState,
  migrateScalabilityState,
  migrateTournamentState,
  migrateTrainingState,
];

export function migrate(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  const migrated = SAVE_MIGRATION_STAGES.reduce(
    (state, migrationStage) => migrationStage(state),
    value as MigratableState,
  );
  const normalized = normalizeLegacySave(migrated);
  // Saves created before the compatibility gate are part of the first
  // compatibility family and can continue through the explicit migrations.
  return normalized.saveCompatibilityVersion === undefined
    ? { ...normalized, saveCompatibilityVersion: 1 }
    : normalized;
}
