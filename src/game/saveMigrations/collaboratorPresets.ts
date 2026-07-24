import {
  createInitialCollaboratorManagement,
  sanitizeCollaboratorTargets,
} from "../collaboratorManagement";
import type { CollaboratorMasteryRole } from "../types";
import type { MigratableState } from "./types";

type LegacyCollaboratorManagement = {
  aggregateViewUnlocked?: boolean;
  targets?: Partial<Record<CollaboratorMasteryRole | "lessons", number>>;
  activePresetId?: unknown;
  hasUnsavedChanges?: unknown;
  presets?: unknown;
};

export function migrateCollaboratorPresetsState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 56) return state;

  const defaults = createInitialCollaboratorManagement();
  const legacy = state.collaboratorManagement as LegacyCollaboratorManagement | undefined;
  return {
    ...state,
    version: 57,
    collaboratorManagement: {
      aggregateViewUnlocked: legacy?.aggregateViewUnlocked === true,
      targets: sanitizeCollaboratorTargets(legacy?.targets ?? defaults.targets),
    },
  };
}
