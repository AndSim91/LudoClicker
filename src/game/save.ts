import { createInitialState } from "./engine";
import { recruitEnrolledLegendaryCollaborators } from "./collaboratorFlow";
import { simulateOfflineProgress } from "./offline";
import { normalizeStackedMessages } from "./messages";
import { STORAGE_KEYS } from "../shared/storageKeys";
import { isSaveCompatible, isValidGameState } from "./saveValidation";
import { migrate as migrateSave } from "./saveMigrations";
import { GAME_CONFIG } from "./config";
import { compactTournamentHistory } from "./tournamentFlow";
import type { GameState } from "./types";

const SAVE_KEY = STORAGE_KEYS.gameSave;
const BACKUP_KEY = `${SAVE_KEY}.backup`;
const HIDDEN_MESSAGE_SUBJECTS = new Set([
  "Nuova lezione di prova prenotata",
  "Stiamo finendo i contatti",
  "Contatti terminati",
]);
const HIDDEN_MESSAGE_PREFIXES = ["Eseguito Corso Agonisti | Potenziale totale +"];

function isHiddenMessageSubject(subject: string): boolean {
  return HIDDEN_MESSAGE_SUBJECTS.has(subject) ||
    HIDDEN_MESSAGE_PREFIXES.some((prefix) => subject.startsWith(prefix));
}



interface ReadResult {
  state: GameState | null;
  incompatible: boolean;
}

function read(key: string): ReadResult {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { state: null, incompatible: false };
    const rawParsed: unknown = JSON.parse(raw);
    if (!isSaveCompatible(rawParsed)) {
      return { state: null, incompatible: true };
    }
    const parsed: unknown = migrateSave(rawParsed);
    return isValidGameState(parsed)
      ? {
          state: {
            ...parsed,
            messages: normalizeStackedMessages(
              parsed.messages.filter(
                (message) => !isHiddenMessageSubject(message.subject),
              ),
            ),
          },
          incompatible: false,
        }
      : { state: null, incompatible: false };
  } catch {
    return { state: null, incompatible: false };
  }
}

function discardStoredSaves(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    // Il gioco può comunque ripartire in memoria se lo storage non è disponibile.
  }
}

export function loadGame(now = Date.now()): GameState {
  const primary = read(SAVE_KEY);
  const backup = primary.state ? { state: null, incompatible: false } : read(BACKUP_KEY);
  const saved = primary.state ?? backup.state;
  if (!saved) {
    if (primary.incompatible || backup.incompatible) discardStoredSaves();
    return createInitialState(now);
  }
  const reconciled = compactTournamentHistory(
    recruitEnrolledLegendaryCollaborators(saved, now),
  );
  return simulateOfflineProgress(reconciled, now).state;
}

export function saveGame(state: GameState, now = Date.now()): boolean {
  try {
    const serialized = JSON.stringify({
      ...state,
      saveCompatibilityVersion: GAME_CONFIG.saveCompatibilityVersion,
      lastSavedAt: now,
    });
    const current = localStorage.getItem(SAVE_KEY);
    if (current) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(SAVE_KEY, serialized);
    return true;
  } catch {
    // Il gioco resta utilizzabile anche quando lo storage del browser è indisponibile.
    return false;
  }
}

export function exportGame(state: GameState): string {
  return JSON.stringify({
    ...state,
    saveCompatibilityVersion: GAME_CONFIG.saveCompatibilityVersion,
  }, null, 2);
}

export function importGame(raw: string): GameState | null {
  try {
    const now = Date.now();
    const rawParsed: unknown = JSON.parse(raw);
    if (!isSaveCompatible(rawParsed)) return null;
    const parsed = migrateSave(rawParsed);
    return isValidGameState(parsed)
      ? simulateOfflineProgress(recruitEnrolledLegendaryCollaborators({
          ...parsed,
          messages: normalizeStackedMessages(parsed.messages),
        }, now), now).state
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
