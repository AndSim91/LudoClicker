import { getEmailPresentationLevel } from "../../content/emailPresentation";
import { getAcquisitionEventDefinition } from "../../content/events";
import { SPECIAL_COLLABORATORS } from "../../content/specialCollaborators";
import { createShortGoalFromStatistics } from "../../content/shortGoals";
import { createInitialUpgradeLevels } from "../../content/upgrades";
import { GAME_CONFIG } from "../config";
import { normalizeStackedMessages } from "../messages";
import type { GameState } from "../types";
import type { MigratableState } from "./types";

export function migratePeopleState(state: MigratableState): MigratableState {
  let migrated = state;

  if (migrated.version === 12) {
    migrated = {
      ...migrated,
      version: 13,
      contacts: migrated.contacts?.map((contact) => {
        const profile = SPECIAL_COLLABORATORS.find(
          (candidate) => candidate.firstName === contact.firstName &&
            candidate.lastName === contact.lastName,
        );
        return profile ? { ...contact, specialProfileId: profile.id } : contact;
      }),
      collaborators: migrated.collaborators?.map((collaborator) => {
        const profile = SPECIAL_COLLABORATORS.find(
          (candidate) => `${candidate.firstName} ${candidate.lastName}` === collaborator.displayName,
        );
        return profile ? { ...collaborator, specialProfileId: profile.id } : collaborator;
      }),
    };
  }

  if (migrated.version === 13) {
    const encounteredProfileIds = [...new Set([
      ...(migrated.contacts ?? []).flatMap((contact) =>
        contact.specialProfileId ? [contact.specialProfileId] : [],
      ),
      ...(migrated.collaborators ?? []).flatMap((collaborator) =>
        collaborator.specialProfileId ? [collaborator.specialProfileId] : [],
      ),
    ])];
    const enrolledProfileIds = [...new Set(
      (migrated.collaborators ?? []).flatMap((collaborator) =>
        collaborator.specialProfileId ? [collaborator.specialProfileId] : [],
      ),
    )];
    migrated = {
      ...migrated,
      version: 14,
      legendaryCollaborators: {
        encounteredProfileIds,
        enrolledProfileIds,
        enrollmentAttempts: Object.fromEntries(
          enrolledProfileIds.map((profileId) => [profileId, 1]),
        ),
        retainedProgress: {},
      },
    };
  }

  if (migrated.version === 14) {
    migrated = {
      ...migrated,
      version: 15,
      contacts: migrated.contacts?.map((contact) => ({
        ...contact,
        rarity: contact.specialProfileId ? "legendary" : "common",
      })),
      collaborators: migrated.collaborators?.map((collaborator) => ({
        ...collaborator,
        rarity: collaborator.specialProfileId ? "legendary" : "common",
      })),
    };
  }

  if (migrated.version === 15) {
    const legacyNextFeeAt = migrated.school?.nextFeeAt ??
      migrated.lastSavedAt ??
      migrated.createdAt ??
      Date.now();
    const qualifiedForms = ["form-1", "course-x", "form-2", "course-y"] as const;
    const collaboratorsByContactId = new Map(
      (migrated.collaborators ?? []).map((collaborator) => [collaborator.contactId, collaborator]),
    );
    migrated = {
      ...migrated,
      version: 16,
      school: migrated.school
        ? {
            ...migrated.school,
            nextFeeAt: legacyNextFeeAt + GAME_CONFIG.gameMonthMs * 2,
          }
        : migrated.school,
      contacts: migrated.contacts?.map((contact) => {
        const existingCollaborator = collaboratorsByContactId.get(contact.id);
        return {
          ...contact,
          rarity: contact.rarity === "common" && existingCollaborator ? "rare" : contact.rarity,
          forms: existingCollaborator
            ? [...new Set([...qualifiedForms, ...(existingCollaborator.forms ?? [])])]
            : [],
          training: undefined,
          lastFormTrainingYear: 0,
        };
      }),
      collaborators: migrated.collaborators?.map((collaborator) => ({
        ...collaborator,
        rarity: collaborator.rarity === "common" ? "rare" : collaborator.rarity,
        forms: [...new Set([...qualifiedForms, ...(collaborator.forms ?? [])])],
        training: collaborator.training && qualifiedForms.includes(
          collaborator.training.formId as (typeof qualifiedForms)[number],
        )
          ? undefined
          : collaborator.training,
        lastFormTrainingYear: 0,
      })),
      unlocks: migrated.unlocks
        ? {
            ...migrated.unlocks,
            forms: migrated.unlocks.forms || (migrated.school?.activeMembers ?? 0) > 0,
          }
        : migrated.unlocks,
    };
  }

  if (migrated.version === 16) {
    const upgrades = {
      ...createInitialUpgradeLevels(),
      ...(migrated.upgrades ?? {}),
    };
    const presentationLevel = getEmailPresentationLevel(upgrades);
    migrated = {
      ...migrated,
      version: 17,
      emails: (migrated.emails ?? []).map((email) => ({
        ...email,
        presentationLevel,
      })),
    };
  }

  if (migrated.version === 17) {
    migrated = {
      ...migrated,
      version: 18,
      automation: migrated.automation
        ? { ...migrated.automation, offlineContactBuffer: 0 }
        : migrated.automation,
      messages: normalizeStackedMessages(migrated.messages ?? []),
    };
  }

  if (migrated.version === 18 && migrated.statistics) {
    const referenceTime = migrated.lastSavedAt ?? migrated.createdAt ?? Date.now();
    migrated = {
      ...migrated,
      version: 19,
      shortGoal: createShortGoalFromStatistics(
        migrated.statistics as GameState["statistics"],
        0,
        referenceTime,
      ),
    };
  }

  if (migrated.version === 19) {
    migrated = {
      ...migrated,
      version: 20,
      acquisitionEvents: (migrated.acquisitionEvents ?? []).map((event) => ({
        ...event,
        membersUsed: event.membersUsed ??
          getAcquisitionEventDefinition(event.definitionId)?.requiredMembers ??
          0,
      })),
    };
  }

  if (migrated.version === 20 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 21,
      contacts: (migrated.contacts ?? []).map((contact) => ({
        ...contact,
        enrolledMonth: contact.status === "enrolled"
          ? contact.enrolledMonth ?? migrated.school?.currentMonth ?? 9
          : contact.enrolledMonth,
      })),
      statistics: {
        ...migrated.statistics,
        membersDeparted: migrated.statistics.membersDeparted ?? 0,
      } as GameState["statistics"],
    };
  }

  return migrated;
}
