import { GAME_CONFIG } from "./config";
import { createInitialState } from "./engine";
import { simulateOfflineProgress } from "./offline";
import { createProspectEmail } from "../content/emailAddresses";
import { createInitialUpgradeLevels, getUpgradeEffectTotal } from "../content/upgrades";
import type { GameState, UpgradeLevels } from "./types";

const SAVE_KEY = "oggetto-nuovi-iscritti.save";
const BACKUP_KEY = `${SAVE_KEY}.backup`;
const HIDDEN_MESSAGE_SUBJECTS = new Set([
  "Nuova lezione di prova prenotata",
  "Stiamo finendo i contatti",
  "Contatti terminati",
]);
const LEGACY_PROSPECT_EMAIL_DOMAIN = "@esempio.test";

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  return (
    state.version === GAME_CONFIG.version &&
    Array.isArray(state.contacts) &&
    Array.isArray(state.emails) &&
    Array.isArray(state.acquisitionEvents) &&
    typeof state.activities?.nextSparringAt === "number" &&
    typeof state.upgrades?.["comfortable-keyboard"] === "number" &&
    typeof state.statistics?.peopleMet === "number" &&
    typeof state.statistics?.demonstrationsGiven === "number" &&
    typeof state.statistics?.maintenanceCompleted === "number" &&
    typeof state.equipment?.totalSwords === "number" &&
    typeof state.equipment?.availableSwords === "number" &&
    typeof state.equipment?.wear === "number" &&
    Array.isArray(state.collaborators) &&
    typeof state.automation?.lastProcessedAt === "number" &&
    typeof state.statistics?.automatedCharacters === "number" &&
    typeof state.statistics?.socialCampaigns === "number" &&
    typeof state.statistics?.formsCompleted === "number" &&
    typeof state.statistics?.narrativeEvents === "number" &&
    typeof state.unlocks?.collaborators === "boolean" &&
    typeof state.unlocks?.forms === "boolean" &&
    Array.isArray(state.achievements) &&
    typeof state.narrative?.nextEventAt === "number" &&
    Array.isArray(state.narrative?.history) &&
    typeof state.randomSeed === "number" &&
    typeof state.profile?.displayName === "string" &&
    typeof state.school?.euros === "number" &&
    typeof state.school?.currentMonth === "number" &&
    typeof state.school?.city === "string" &&
    typeof state.school?.accentColor === "string" &&
    typeof state.network?.reputation === "number" &&
    Array.isArray(state.network?.schools) &&
    typeof state.network?.prestigeOfferSent === "boolean"
  );
}

function migrate(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  type MigratableState = Partial<GameState> & {
    version?: number;
    statistics?: Partial<GameState["statistics"]>;
    upgrades?: Partial<UpgradeLevels> & { speedLevel?: number };
  };
  let migrated = value as MigratableState;

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
      version: GAME_CONFIG.version,
      school: migrated.school
        ? {
            ...migrated.school,
            currentMonth: migrated.school.currentMonth ?? 1,
          }
        : migrated.school,
    };
  }

  if (migrated.contacts?.some((contact) => contact.email.endsWith(LEGACY_PROSPECT_EMAIL_DOMAIN))) {
    migrated = {
      ...migrated,
      contacts: migrated.contacts.map((contact, index) =>
        contact.email.endsWith(LEGACY_PROSPECT_EMAIL_DOMAIN)
          ? {
              ...contact,
              email: createProspectEmail(
                contact.email.slice(0, -LEGACY_PROSPECT_EMAIL_DOMAIN.length),
                index,
              ),
            }
          : contact,
      ),
    };
  }

  if (!migrated.profile) {
    migrated = {
      ...migrated,
      profile: { displayName: "" },
    };
  }

  return migrated;
}

function read(key: string): GameState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = migrate(JSON.parse(raw));
    return isGameState(parsed)
      ? {
          ...parsed,
          messages: parsed.messages.filter(
            (message) => !HIDDEN_MESSAGE_SUBJECTS.has(message.subject),
          ),
        }
      : null;
  } catch {
    return null;
  }
}

export function loadGame(now = Date.now()): GameState {
  const saved = read(SAVE_KEY) ?? read(BACKUP_KEY);
  if (!saved) return createInitialState(now);
  if (!saved.profile.displayName.trim()) {
    return {
      ...saved,
      lastSavedAt: now,
      automation: { ...saved.automation, lastProcessedAt: now },
    };
  }
  return simulateOfflineProgress(saved, now).state;
}

export function saveGame(state: GameState, now = Date.now()): void {
  try {
    const current = localStorage.getItem(SAVE_KEY);
    if (current) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, lastSavedAt: now }));
  } catch {
    // Il gioco resta utilizzabile anche quando lo storage del browser è indisponibile.
  }
}

export function exportGame(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

export function importGame(raw: string): GameState | null {
  try {
    const parsed = migrate(JSON.parse(raw));
    return isGameState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function resetGame(now = Date.now()): GameState {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(BACKUP_KEY);
  return createInitialState(now);
}
