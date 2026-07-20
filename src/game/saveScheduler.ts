import type { GameState } from "./types";

type PersistGame = (state: GameState, now?: number) => boolean;

export interface SaveScheduler {
  markDirty: (state: GameState) => void;
  flush: (now?: number) => boolean;
  saveNow: (now?: number) => boolean;
  isDirty: () => boolean;
  start: (
    intervalMs: number,
    onNextSaveScheduled?: (nextSaveAt: number) => void,
  ) => () => void;
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

  const saveNow = (now = Date.now()) => {
    const revisionBeingSaved = revision;
    if (!persist(currentState, now)) return false;

    savedRevision = revisionBeingSaved;
    return true;
  };

  const flush = (now = Date.now()) => {
    if (revision === savedRevision) return false;
    return saveNow(now);
  };

  return {
    markDirty: (state) => {
      currentState = state;
      revision += 1;
    },
    flush,
    saveNow,
    isDirty: () => revision !== savedRevision,
    start: (intervalMs, onNextSaveScheduled) => {
      onNextSaveScheduled?.(Date.now() + intervalMs);
      let pendingSaveId: number | undefined;
      const intervalId = window.setInterval(() => {
        const scheduledAt = Date.now();
        onNextSaveScheduled?.(Date.now() + intervalMs);
        // Lascia terminare gli altri timer di gioco scattati nello stesso
        // istante, così la fotografia include anche il loro stato più recente.
        pendingSaveId = window.setTimeout(() => {
          pendingSaveId = undefined;
          saveNow(scheduledAt);
        }, 0);
      }, intervalMs);
      return () => {
        window.clearInterval(intervalId);
        if (pendingSaveId !== undefined) window.clearTimeout(pendingSaveId);
      };
    },
  };
}
