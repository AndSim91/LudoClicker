import { createInitialUpgradeLevels } from "../../content/upgrades";
import type { RetainedLegendaryProgress } from "../types";
import type { MigratableState } from "./types";

function normalizeTrainingCount(
  lastFormTrainingYear: number | undefined,
  formTrainingYearCount: number | undefined,
): number | undefined {
  if (lastFormTrainingYear === undefined) return undefined;
  return Math.max(1, Math.floor(formTrainingYearCount ?? 1));
}

export function migrateTrainingState(state: MigratableState): MigratableState {
  if (state.version !== 37) return state;

  const retainedProgress = Object.fromEntries(
    Object.entries(state.legendaryCollaborators?.retainedProgress ?? {}).map(
      ([profileId, progress]) => {
        const retained = progress as RetainedLegendaryProgress;
        return [profileId, {
          ...retained,
          formTrainingYearCount: normalizeTrainingCount(
            retained.lastFormTrainingYear,
            retained.formTrainingYearCount,
          ),
        }];
      },
    ),
  );

  return {
    ...state,
    version: 38,
    upgrades: { ...createInitialUpgradeLevels(), ...(state.upgrades ?? {}) },
    contacts: (state.contacts ?? []).map((contact) => ({
      ...contact,
      formTrainingYearCount: normalizeTrainingCount(
        contact.lastFormTrainingYear,
        contact.formTrainingYearCount,
      ),
    })),
    collaborators: (state.collaborators ?? []).map((collaborator) => ({
      ...collaborator,
      formTrainingYearCount: normalizeTrainingCount(
        collaborator.lastFormTrainingYear,
        collaborator.formTrainingYearCount,
      ),
    })),
    legendaryCollaborators: state.legendaryCollaborators
      ? { ...state.legendaryCollaborators, retainedProgress }
      : state.legendaryCollaborators,
  };
}
