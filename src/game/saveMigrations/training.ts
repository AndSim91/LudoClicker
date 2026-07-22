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
  let migrated = state;

  if (migrated.version === 37) {
    const retainedProgress = Object.fromEntries(
      Object.entries(migrated.legendaryCollaborators?.retainedProgress ?? {}).map(
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

    migrated = {
      ...migrated,
      version: 38,
      upgrades: { ...createInitialUpgradeLevels(), ...(migrated.upgrades ?? {}) },
      contacts: (migrated.contacts ?? []).map((contact) => ({
        ...contact,
        formTrainingYearCount: normalizeTrainingCount(
          contact.lastFormTrainingYear,
          contact.formTrainingYearCount,
        ),
      })),
      collaborators: (migrated.collaborators ?? []).map((collaborator) => ({
        ...collaborator,
        formTrainingYearCount: normalizeTrainingCount(
          collaborator.lastFormTrainingYear,
          collaborator.formTrainingYearCount,
        ),
      })),
      legendaryCollaborators: migrated.legendaryCollaborators
        ? { ...migrated.legendaryCollaborators, retainedProgress }
        : migrated.legendaryCollaborators,
    };
  }

  if (migrated.version === 38) {
    migrated = {
      ...migrated,
      version: 39,
      upgrades: { ...createInitialUpgradeLevels(), ...(migrated.upgrades ?? {}) },
      automation: {
        lastProcessedAt:
          migrated.automation?.lastProcessedAt ??
          migrated.lastSavedAt ??
          migrated.createdAt ??
          Date.now(),
        autoSendEmails: migrated.automation?.autoSendEmails ?? true,
        writingBuffer: migrated.automation?.writingBuffer ?? 0,
        lessonBuffer: migrated.automation?.lessonBuffer ?? 0,
        socialBuffer: migrated.automation?.socialBuffer ?? 0,
        equipmentBuffer: migrated.automation?.equipmentBuffer ?? 0,
        offlineContactBuffer: migrated.automation?.offlineContactBuffer ?? 0,
      },
    };
  }

  if (migrated.version === 39) {
    migrated = {
      ...migrated,
      version: 40,
      automation: {
        lastProcessedAt:
          migrated.automation?.lastProcessedAt ??
          migrated.lastSavedAt ??
          migrated.createdAt ??
          Date.now(),
        autoSendEmails: migrated.automation?.autoSendEmails ?? true,
        writingBuffer: migrated.automation?.writingBuffer ?? 0,
        lessonBuffer: migrated.automation?.lessonBuffer ?? 0,
        socialBuffer: migrated.automation?.socialBuffer ?? 0,
        equipmentBuffer: migrated.automation?.equipmentBuffer ?? 0,
        offlineContactBuffer: migrated.automation?.offlineContactBuffer ?? 0,
        lastImprovedAthlete: migrated.automation?.lastImprovedAthlete,
      },
      statistics: {
        ...migrated.statistics,
        socialTrials: migrated.statistics?.socialTrials ?? 0,
      } as MigratableState["statistics"],
    };
  }

  if (migrated.version === 40) {
    const previousTiamatLevel = Math.max(
      0,
      Math.min(5, Math.floor(migrated.upgrades?.["tiamat-instructor"] ?? 0)),
    );
    migrated = {
      ...migrated,
      version: 41,
      upgrades: {
        ...createInitialUpgradeLevels(),
        ...(migrated.upgrades ?? {}),
        "promiscuous-instructor": previousTiamatLevel > 0 ? 1 : 0,
        "tiamat-instructor": Math.max(0, previousTiamatLevel - 1),
        pagosport: 0,
      },
    };
  }

  if (migrated.version === 41) {
    migrated = {
      ...migrated,
      version: 42,
      upgrades: {
        ...createInitialUpgradeLevels(),
        ...(migrated.upgrades ?? {}),
      },
    };
  }

  if (migrated.version === 42) {
    migrated = {
      ...migrated,
      version: 43,
      school: migrated.school
        ? { ...migrated.school, followers: migrated.school.followers ?? 0 }
        : migrated.school,
    };
  }

  if (migrated.version === 43) {
    const automation = Object.fromEntries(
      Object.entries(migrated.automation ?? {}).filter(
        ([key]) => key !== "agonistCoursesEnabled",
      ),
    ) as MigratableState["automation"];
    migrated = {
      ...migrated,
      version: 44,
      contacts: (migrated.contacts ?? []).map((contact) => ({
        ...contact,
        agonistCourseCompletions: Math.max(
          0,
          Math.floor(contact.agonistCourseCompletions ?? 0),
        ),
      })),
      automation,
    };
  }

  if (migrated.version === 44) {
    const upgrades = { ...createInitialUpgradeLevels(), ...(migrated.upgrades ?? {}) };
    const automaticCertificates = (upgrades.pagosport ?? 0) >= 2;
    migrated = {
      ...migrated,
      version: 45,
      upgrades,
      collaborators: (migrated.collaborators ?? []).map((collaborator) => ({
        ...collaborator,
        instructorForms: automaticCertificates
          ? [...collaborator.forms]
          : [...(collaborator.instructorForms ?? [])],
      })),
    };
  }

  return migrated;
}
