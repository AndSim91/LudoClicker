import { getAcquisitionEventDefinition } from "../../content/events";
import { FORM_BRANCHES, getFormDefinition } from "../../content/forms";
import {
  COLLABORATOR_MASTERY_ROLES,
  createInitialCollaboratorMastery,
} from "../../content/mastery";
import { createInitialUpgradeLevels } from "../../content/upgrades";
import type { CollaboratorMastery, GameState } from "../types";
import type { MigratableState } from "./types";

export function migrateProgressionState(state: MigratableState): MigratableState {
  let migrated = state;

  if (migrated.version === 21) {
    const recordedDepartures = (migrated.contacts ?? []).filter(
      (contact) => contact.status === "departed",
    ).length;
    const missedRenewals = (migrated.narrative?.history ?? []).filter(
      (event) => event.definitionId === "missed-renewal",
    ).length;
    const highestUnlockedEvent = (migrated.acquisitionEvents ?? []).reduce(
      (highest, event) => Math.max(
        highest,
        getAcquisitionEventDefinition(event.definitionId)?.unlockMembers ?? 0,
      ),
      0,
    );
    migrated = {
      ...migrated,
      version: 22,
      school: migrated.school
        ? {
            ...migrated.school,
            peakActiveMembers: Math.max(
              migrated.school.activeMembers ?? 0,
              (migrated.school.activeMembers ?? 0) + recordedDepartures + missedRenewals,
              highestUnlockedEvent,
            ),
          }
        : migrated.school,
    };
  }

  if (migrated.version === 22) {
    migrated = {
      ...migrated,
      version: 23,
      collaborators: (migrated.collaborators ?? []).map((collaborator) => ({
        ...collaborator,
        instructorForms: collaborator.instructorForms ?? [],
      })),
    };
  }

  if (migrated.version === 23) {
    const retainedProgress = Object.fromEntries(
      (migrated.collaborators ?? []).flatMap((collaborator) =>
        collaborator.specialProfileId
          ? [[collaborator.specialProfileId, {
              forms: [...collaborator.forms],
              instructorForms: [...(collaborator.instructorForms ?? [])],
              joinedAt: collaborator.joinedAt,
              lastFormTrainingYear: collaborator.lastFormTrainingYear,
            }]]
          : [],
      ),
    );
    migrated = {
      ...migrated,
      version: 24,
      legendaryCollaborators: migrated.legendaryCollaborators
        ? { ...migrated.legendaryCollaborators, retainedProgress }
        : migrated.legendaryCollaborators,
    };
  }

  if (migrated.version === 24) {
    const preferencesFor = (forms: GameState["contacts"][number]["forms"], index: number) => {
      if (!forms.includes("course-y")) return [];
      const learnedBranches = FORM_BRANCHES.filter((branch) =>
        forms.some((formId) => getFormDefinition(formId)?.branch === branch)
      );
      return learnedBranches.length > 0
        ? learnedBranches
        : [FORM_BRANCHES[index % FORM_BRANCHES.length]];
    };
    const retainedProgress = Object.fromEntries(
      Object.entries(migrated.legendaryCollaborators?.retainedProgress ?? {}).map(
        ([profileId, retained], index) => [profileId, retained
          ? {
              ...retained,
              formBranchPreferences: retained.formBranchPreferences ??
                preferencesFor(retained.forms, index),
            }
          : retained],
      ),
    );
    migrated = {
      ...migrated,
      version: 25,
      contacts: (migrated.contacts ?? []).map((contact, index) => ({
        ...contact,
        formBranchPreferences: contact.formBranchPreferences ??
          preferencesFor(contact.forms, index),
      })),
      collaborators: (migrated.collaborators ?? []).map((collaborator, index) => ({
        ...collaborator,
        formBranchPreferences: collaborator.formBranchPreferences ??
          preferencesFor(collaborator.forms, index),
      })),
      legendaryCollaborators: migrated.legendaryCollaborators
        ? { ...migrated.legendaryCollaborators, retainedProgress }
        : migrated.legendaryCollaborators,
      upgrades: { ...createInitialUpgradeLevels(), ...(migrated.upgrades ?? {}) },
    };
  }

  if (migrated.version === 25) {
    const normalizeMastery = (
      mastery: (Partial<CollaboratorMastery> & { lessons?: number }) | undefined,
    ): CollaboratorMastery => {
      const defaults = createInitialCollaboratorMastery();
      return Object.fromEntries(
        COLLABORATOR_MASTERY_ROLES.map((role) => [
          role,
          Math.max(
            0,
            role === "instructor"
              ? Math.max(mastery?.instructor ?? 0, mastery?.lessons ?? 0)
              : Number.isFinite(mastery?.[role])
                ? mastery?.[role] ?? 0
                : defaults[role],
          ),
        ]),
      ) as CollaboratorMastery;
    };
    migrated = {
      ...migrated,
      version: 26,
      collaborators: (migrated.collaborators ?? []).map((collaborator) => ({
        ...collaborator,
        mastery: normalizeMastery(collaborator.mastery),
      })),
    };
  }

  return migrated;
}
