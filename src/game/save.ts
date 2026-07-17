import { createInitialState } from "./engine";
import { recruitEnrolledLegendaryCollaborators } from "./collaboratorFlow";
import { simulateOfflineProgress } from "./offline";
import { normalizeStackedMessages } from "./messages";
import { STORAGE_KEYS } from "../shared/storageKeys";
import { isValidGameState } from "./saveValidation";
import { migrate as migrateSave } from "./saveMigrations";
import type { GameState } from "./types";

const SAVE_KEY = STORAGE_KEYS.gameSave;
const BACKUP_KEY = `${SAVE_KEY}.backup`;
const HIDDEN_MESSAGE_SUBJECTS = new Set([
  "Nuova lezione di prova prenotata",
  "Stiamo finendo i contatti",
  "Contatti terminati",
]);



function read(key: string): GameState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = migrateSave(JSON.parse(raw));
    return isValidGameState(parsed)
      ? {
          ...parsed,
          messages: normalizeStackedMessages(
            parsed.messages.filter(
              (message) => !HIDDEN_MESSAGE_SUBJECTS.has(message.subject),
            ),
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
  const reconciled = recruitEnrolledLegendaryCollaborators(saved, now);
  if (!reconciled.profile.displayName.trim()) {
    return {
      ...reconciled,
      lastSavedAt: now,
      automation: { ...reconciled.automation, lastProcessedAt: now },
    };
  }
  return simulateOfflineProgress(reconciled, now).state;
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
    const parsed = migrateSave(JSON.parse(raw));
    return isValidGameState(parsed)
      ? recruitEnrolledLegendaryCollaborators({
          ...parsed,
          messages: normalizeStackedMessages(parsed.messages),
        }, Date.now())
      : null;
  } catch {
    return null;
  }
}

export function resetGame(now = Date.now()): GameState {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(BACKUP_KEY);
  return createInitialState(now);
}
