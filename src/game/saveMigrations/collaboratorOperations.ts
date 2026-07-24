import {
  createEmptyCollaboratorTargets,
  sanitizeCollaboratorTargets,
} from "../collaboratorManagement";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import { createInitialUpgradeLevels } from "../../content/upgrades";
import type {
  CollaboratorMastery,
  CollaboratorMasteryRole,
} from "../types";
import type { MigratableState } from "./types";

type LegacyMastery = Partial<CollaboratorMastery> & { lessons?: number };
type LegacyTargets = Partial<Record<CollaboratorMasteryRole | "lessons", number>>;
type LegacyPresetId = "preset-1" | "preset-2" | "preset-3";

function migrateMastery(mastery?: LegacyMastery): CollaboratorMastery {
  const defaults = createInitialCollaboratorMastery();
  return {
    writing: Math.max(0, mastery?.writing ?? defaults.writing),
    events: Math.max(0, mastery?.events ?? defaults.events),
    equipment: Math.max(0, mastery?.equipment ?? defaults.equipment),
    instructor: Math.max(
      0,
      mastery?.instructor ?? defaults.instructor,
      mastery?.lessons ?? 0,
    ),
  };
}

function migratePreset(
  preset: { saved?: boolean; targets?: LegacyTargets } | undefined,
): { saved: boolean; targets: Record<CollaboratorMasteryRole, number> } {
  return {
    saved: preset?.saved === true,
    targets: sanitizeCollaboratorTargets(preset?.targets ?? {}),
  };
}

export function migrateCollaboratorOperationsState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 54) return state;

  const collaborators = (state.collaborators ?? []).map((collaborator) => {
    const { mastery, assignment, ...legacyRest } = collaborator;
    const rest = { ...legacyRest };
    delete rest.autoTeachingEnabled;
    return {
      ...rest,
      assignment: assignment === "lessons"
        ? "instructor" as const
        : assignment === "social"
          ? null
          : assignment,
      mastery: migrateMastery(mastery),
    };
  });
  const targets = createEmptyCollaboratorTargets();
  for (const collaborator of collaborators) {
    if (collaborator.assignment) {
      targets[collaborator.assignment] += 1;
    }
  }

  const legacyManagement = state.collaboratorManagement as
    | {
        aggregateViewUnlocked?: boolean;
        activePresetId?: LegacyPresetId | null;
        presets?: Partial<Record<LegacyPresetId, {
          saved?: boolean;
          targets?: LegacyTargets;
        }>>;
      }
    | undefined;
  const migratedPresets = {
    "preset-1": migratePreset(legacyManagement?.presets?.["preset-1"]),
    "preset-2": migratePreset(legacyManagement?.presets?.["preset-2"]),
    "preset-3": migratePreset(legacyManagement?.presets?.["preset-3"]),
  };
  const activePresetId = legacyManagement?.activePresetId;
  const validActivePresetId = activePresetId && migratedPresets[activePresetId].saved
    ? activePresetId
    : null;

  const retainedProgress = Object.fromEntries(
    Object.entries(state.legendaryCollaborators?.retainedProgress ?? {}).map(
      ([profileId, progress]) => [
        profileId,
        progress
          ? {
              ...progress,
              mastery: migrateMastery(progress.mastery as LegacyMastery | undefined),
            }
          : progress,
      ],
    ),
  );

  return {
    ...state,
    version: 55,
    collaborators,
    collaboratorManagement: {
      aggregateViewUnlocked: legacyManagement?.aggregateViewUnlocked === true,
      targets: validActivePresetId
        ? { ...migratedPresets[validActivePresetId].targets }
        : targets,
    },
    legendaryCollaborators: state.legendaryCollaborators
      ? {
          ...state.legendaryCollaborators,
          retainedProgress,
        }
      : state.legendaryCollaborators,
    upgrades: {
      ...createInitialUpgradeLevels(),
      ...(state.upgrades ?? {}),
    },
  };
}
