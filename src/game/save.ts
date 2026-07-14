import { GAME_CONFIG } from "./config";
import { createInitialState } from "./engine";
import { createInitialUpgradeLevels } from "../content/upgrades";
import type { GameState, UpgradeLevels } from "./types";

const SAVE_KEY = "oggetto-nuovi-iscritti.save";
const BACKUP_KEY = `${SAVE_KEY}.backup`;
const HIDDEN_MESSAGE_SUBJECTS = new Set(["Nuova lezione di prova prenotata"]);

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
    typeof state.randomSeed === "number" &&
    typeof state.school?.euros === "number"
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
      version: GAME_CONFIG.version,
      upgrades,
      player: { writingPower: 1 + legacySpeedLevel },
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
  return read(SAVE_KEY) ?? read(BACKUP_KEY) ?? createInitialState(now);
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
