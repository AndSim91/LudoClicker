import { createInitialState } from "./engine";
import { recruitEnrolledLegendaryCollaborators } from "./collaboratorFlow";
import { simulateOfflineProgress } from "./offline";
import { normalizeStackedMessages } from "./messages";
import { STORAGE_KEYS } from "../shared/storageKeys";
import { isSaveCompatible, isValidGameState } from "./saveValidation";
import { migrate as migrateSave } from "./saveMigrations";
import { GAME_CONFIG } from "./config";
import { compactTournamentHistory } from "./tournamentFlow";
import { createSaveFailure, type SaveGameResult, type SaveOperation } from "./saveDiagnostics";
import { decodeStoredSave, normalizeStoredSave } from "./saveCodec";
import { prepareStoredGameSave } from "./savePreparation";
import type { GameState } from "./types";

const SAVE_KEY = STORAGE_KEYS.gameSave;
const BACKUP_KEY = `${SAVE_KEY}.backup`;
const HIDDEN_MESSAGE_SUBJECTS = new Set([
  "Nuova lezione di prova prenotata",
  "Stiamo finendo i contatti",
  "Contatti terminati",
]);
const HIDDEN_MESSAGE_PREFIXES = ["Corso Agonisti | Potenziale totale +"];

function isHiddenMessageSubject(subject: string): boolean {
  return (
    HIDDEN_MESSAGE_SUBJECTS.has(subject) ||
    HIDDEN_MESSAGE_PREFIXES.some((prefix) => subject.startsWith(prefix))
  );
}

interface ReadResult {
  state: GameState | null;
  incompatible: boolean;
}

function parseStoredSave(raw: string): ReadResult {
  try {
    const rawParsed = decodeStoredSave(raw);
    if (!isSaveCompatible(rawParsed)) {
      return { state: null, incompatible: true };
    }
    const parsed: unknown = migrateSave(rawParsed);
    return isValidGameState(parsed)
      ? {
          state: {
            ...parsed,
            messages: normalizeStackedMessages(
              parsed.messages.filter((message) => !isHiddenMessageSubject(message.subject)),
            ),
          },
          incompatible: false,
        }
      : { state: null, incompatible: false };
  } catch {
    return { state: null, incompatible: false };
  }
}

function read(key: string): ReadResult {
  try {
    const raw = localStorage.getItem(key);
    return raw ? parseStoredSave(raw) : { state: null, incompatible: false };
  } catch {
    // Il gioco può comunque ripartire in memoria se lo storage non è disponibile.
    return { state: null, incompatible: false };
  }
}

function createStoredSaveProtectionFailure(serializedLength: number): SaveGameResult {
  return {
    ok: false,
    error: {
      reason: "stored-save-protected",
      operation: "protect-existing",
      errorName: "StoredSaveRejected",
      errorMessage:
        "Il salvataggio esistente non ha superato la decodifica, la migrazione o la validazione.",
      serializedLength,
    },
  };
}

export function loadGame(now = Date.now()): GameState {
  const primary = read(SAVE_KEY);
  const backup = primary.state ? { state: null, incompatible: false } : read(BACKUP_KEY);
  const saved = primary.state ?? backup.state;
  if (!saved) {
    return createInitialState(now);
  }
  const reconciled = compactTournamentHistory(recruitEnrolledLegendaryCollaborators(saved, now));
  return simulateOfflineProgress(reconciled, now).state;
}

export function writePreparedGameSave(serialized: string): SaveGameResult {
  const runStorageOperation = <T>(
    operation: SaveOperation,
    callback: () => T,
  ): T | SaveGameResult => {
    try {
      return callback();
    } catch (error) {
      return {
        ok: false,
        error: createSaveFailure(operation, error, serialized.length),
      };
    }
  };

  const currentResult = runStorageOperation("read-current", () => localStorage.getItem(SAVE_KEY));
  if (typeof currentResult !== "string" && currentResult !== null) {
    return currentResult;
  }

  if (!currentResult) {
    const storedBackupResult = runStorageOperation("read-backup", () =>
      localStorage.getItem(BACKUP_KEY),
    );
    if (typeof storedBackupResult !== "string" && storedBackupResult !== null) {
      return storedBackupResult;
    }
    if (storedBackupResult && !parseStoredSave(storedBackupResult).state) {
      return createStoredSaveProtectionFailure(serialized.length);
    }
  }

  if (currentResult) {
    const currentSave = parseStoredSave(currentResult);
    if (!currentSave.state) {
      const storedBackupResult = runStorageOperation("read-backup", () =>
        localStorage.getItem(BACKUP_KEY),
      );
      if (typeof storedBackupResult !== "string" && storedBackupResult !== null) {
        return storedBackupResult;
      }
      const validBackup = storedBackupResult
        ? parseStoredSave(storedBackupResult).state
        : null;
      if (!validBackup) return createStoredSaveProtectionFailure(serialized.length);

      // Se il caricamento ha recuperato la partita dal backup, ripristiniamo il
      // principale senza sostituire il backup valido con quello corrotto.
      const recoveredSaveResult = runStorageOperation("write-primary", () =>
        localStorage.setItem(SAVE_KEY, serialized),
      );
      if (typeof recoveredSaveResult !== "undefined") return recoveredSaveResult;
      return { ok: true };
    }

    const backupResult = runStorageOperation("write-backup", () =>
      localStorage.setItem(BACKUP_KEY, normalizeStoredSave(currentResult)),
    );
    if (typeof backupResult !== "undefined") return backupResult;
  }

  const saveResult = runStorageOperation("write-primary", () =>
    localStorage.setItem(SAVE_KEY, serialized),
  );
  if (typeof saveResult !== "undefined") return saveResult;

  return { ok: true };
}

export function trySaveGame(state: GameState, now = Date.now()): SaveGameResult {
  const prepared = prepareStoredGameSave(state, now);
  if (!prepared.ok) return prepared;
  return writePreparedGameSave(prepared.serialized);
}

export function saveGame(state: GameState, now = Date.now()): boolean {
  return trySaveGame(state, now).ok;
}

export function exportGame(state: GameState): string {
  return JSON.stringify(
    {
      ...state,
      saveCompatibilityVersion: GAME_CONFIG.saveCompatibilityVersion,
    },
    null,
    2,
  );
}

export function importGame(raw: string): GameState | null {
  try {
    const now = Date.now();
    const rawParsed: unknown = JSON.parse(raw);
    if (!isSaveCompatible(rawParsed)) return null;
    const parsed = migrateSave(rawParsed);
    return isValidGameState(parsed)
      ? simulateOfflineProgress(
          recruitEnrolledLegendaryCollaborators(
            {
              ...parsed,
              messages: normalizeStackedMessages(parsed.messages),
            },
            now,
          ),
          now,
        ).state
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
