import { createInitialUpgradeLevels, getUpgradeEffectTotal } from "../../content/upgrades";
import { GAME_CONFIG } from "../config";
import type { GameState } from "../types";
import type { MigratableState } from "./types";

export function migrateCoreState(state: MigratableState): MigratableState {
  let migrated = state;

  if (migrated.version === 1 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 2,
      acquisitionEvents: [],
      activities: {
        nextSparringAt: migrated.lastSavedAt ?? migrated.createdAt ?? Date.now(),
      },
      statistics: {
        ...migrated.statistics,
        contactsAcquired: 0,
        eventsCompleted: 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 2) {
    const legacySpeedLevel =
      migrated.upgrades?.speedLevel ?? Math.max(0, (migrated.player?.writingPower ?? 1) - 1);
    const upgrades = createInitialUpgradeLevels();
    upgrades["comfortable-keyboard"] = legacySpeedLevel;
    migrated = {
      ...migrated,
      version: 3,
      upgrades,
      player: { writingPower: 1 + legacySpeedLevel },
    };
  }

  if (migrated.version === 3 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 4,
      acquisitionEvents: (migrated.acquisitionEvents ?? []).map((event) => ({
        ...event,
        peopleMet: event.peopleMet ?? Math.max(0, (event.contactReward ?? 0) * 5),
        demonstrationsGiven:
          event.demonstrationsGiven ?? Math.max(0, (event.contactReward ?? 0) * 2),
      })),
      statistics: {
        ...migrated.statistics,
        peopleMet: migrated.statistics.peopleMet ?? 0,
        demonstrationsGiven: migrated.statistics.demonstrationsGiven ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 4 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 5,
      equipment: migrated.equipment ?? {
        totalSwords: 6,
        availableSwords: 6,
        damagedSwords: 0,
        wear: 0,
      },
      acquisitionEvents: (migrated.acquisitionEvents ?? []).map((event) => ({
        ...event,
        equipmentUsed: event.equipmentUsed ?? 0,
        wearAdded: event.wearAdded ?? 0,
      })),
      statistics: {
        ...migrated.statistics,
        maintenanceCompleted: migrated.statistics.maintenanceCompleted ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 5 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 6,
      collaborators: migrated.collaborators ?? [],
      automation: migrated.automation ?? {
        lastProcessedAt: migrated.lastSavedAt ?? migrated.createdAt ?? Date.now(),
        writingBuffer: 0,
        socialBuffer: 0,
        equipmentBuffer: 0,
        offlineContactBuffer: 0,
      },
      unlocks: {
        upgrades: migrated.unlocks?.upgrades ?? false,
        collaborators: migrated.unlocks?.collaborators ?? false,
        social: migrated.unlocks?.social ?? false,
        forms: migrated.unlocks?.forms ?? false,
      },
      statistics: {
        ...migrated.statistics,
        collaboratorsRecruited: migrated.statistics.collaboratorsRecruited ?? 0,
        automatedCharacters: migrated.statistics.automatedCharacters ?? 0,
        socialContacts: migrated.statistics.socialContacts ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 6 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 7,
      statistics: {
        ...migrated.statistics,
        socialCampaigns: migrated.statistics.socialCampaigns ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 7 && migrated.statistics) {
    migrated = {
      ...migrated,
      version: 8,
      collaborators: (migrated.collaborators ?? []).map((collaborator) => ({
        ...collaborator,
        forms: collaborator.forms ?? [],
      })),
      unlocks: {
        upgrades: migrated.unlocks?.upgrades ?? false,
        collaborators: migrated.unlocks?.collaborators ?? false,
        social: migrated.unlocks?.social ?? false,
        forms: migrated.unlocks?.forms ?? false,
      },
      statistics: {
        ...migrated.statistics,
        formsCompleted: migrated.statistics.formsCompleted ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 8) {
    const upgrades = {
      ...createInitialUpgradeLevels(),
      ...(migrated.upgrades ?? {}),
    };
    const totalSwords =
      GAME_CONFIG.initialSwords + Math.floor(getUpgradeEffectTotal(upgrades, "totalSwords"));
    migrated = {
      ...migrated,
      version: 9,
      upgrades,
      equipment: migrated.equipment
        ? {
            ...migrated.equipment,
            totalSwords,
            availableSwords: Math.min(totalSwords, migrated.equipment.availableSwords),
          }
        : migrated.equipment,
    };
  }

  if (migrated.version === 9 && migrated.statistics) {
    const referenceTime = migrated.lastSavedAt ?? migrated.createdAt ?? Date.now();
    migrated = {
      ...migrated,
      version: 10,
      achievements: migrated.achievements ?? [],
      narrative: migrated.narrative ?? {
        nextEventAt: referenceTime + GAME_CONFIG.narrativeEventMinMs,
        history: [],
      },
      statistics: {
        ...migrated.statistics,
        narrativeEvents: migrated.statistics.narrativeEvents ?? 0,
      } as GameState["statistics"],
    };
  }

  if (migrated.version === 10) {
    migrated = {
      ...migrated,
      version: 11,
      school: migrated.school
        ? {
            ...migrated.school,
            city: migrated.school.city ?? "Genova",
            accentColor: migrated.school.accentColor ?? "#0f6cbd",
            motto: migrated.school.motto ?? "Ogni onda comincia da un movimento",
            specialization: migrated.school.specialization ?? "generale",
          }
        : migrated.school,
      network: migrated.network ?? {
        reputation: 0,
        schools: [],
        prestigeOfferSent: false,
      },
    };
  }

  if (migrated.version === 11) {
    migrated = {
      ...migrated,
      version: 12,
      school: migrated.school
        ? {
            ...migrated.school,
            currentMonth: migrated.school.currentMonth ?? 9,
          }
        : migrated.school,
    };
  }

  return migrated;
}
