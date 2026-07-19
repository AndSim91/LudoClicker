import type { GameState } from "./types";

type PersistGame = (state: GameState, now?: number) => boolean;

export interface SaveScheduler {
  markDirty: (state: GameState) => void;
  flush: (now?: number) => boolean;
  isDirty: () => boolean;
  start: (intervalMs: number) => () => void;
}

export function createSaveScheduler(
  initialState: GameState,
  persist: PersistGame,
): SaveScheduler {
  // loadGame può aver applicato migrazioni o progresso offline: il primo stato
  // va quindi consolidato almeno una volta, anche senza ulteriori azioni.
  let revision = 1;
  let savedRevision = 0;
  let currentState = initialState;

  const flush = (now = Date.now()) => {
    if (revision === savedRevision) return false;

    const revisionBeingSaved = revision;
    if (!persist(currentState, now)) return false;

    savedRevision = revisionBeingSaved;
    return true;
  };

  return {
    markDirty: (state) => {
      currentState = state;
      revision += 1;
    },
    flush,
    isDirty: () => revision !== savedRevision,
    start: (intervalMs) => {
      const intervalId = window.setInterval(() => flush(), intervalMs);
      return () => window.clearInterval(intervalId);
    },
  };
}
