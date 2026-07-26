import type { GameState } from "./types";

type PersistGame = (state: GameState, now?: number) => boolean;

export interface PreparedPersistence {
  commit: () => boolean;
}

type PreparePersistence = (
  state: GameState,
  now: number,
) => Promise<PreparedPersistence>;

export interface SaveScheduler {
  markDirty: (state: GameState) => void;
  flush: (now?: number) => boolean;
  flushInBackground: (now?: number) => Promise<boolean>;
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
  prepareInBackground?: PreparePersistence,
): SaveScheduler {
  // loadGame può aver applicato migrazioni o progresso offline: il primo stato
  // va quindi consolidato almeno una volta, anche senza ulteriori azioni.
  let revision = 1;
  let savedRevision = 0;
  let currentState = initialState;
  let persistenceGeneration = 0;
  let pendingBackgroundSave: Promise<boolean> | undefined;
  let forceBackgroundSave = false;
  let backgroundStopped = false;

  const saveNow = (now = Date.now()) => {
    // Un risultato già in preparazione non deve sovrascrivere questo snapshot.
    persistenceGeneration += 1;
    const revisionBeingSaved = revision;
    if (!persist(currentState, now)) return false;

    savedRevision = revisionBeingSaved;
    return true;
  };

  const flush = (now = Date.now()) => {
    if (revision === savedRevision) return false;
    return saveNow(now);
  };

  const queueBackgroundSave = (now: number, force: boolean): Promise<boolean> => {
    if (!prepareInBackground) {
      return Promise.resolve(force ? saveNow(now) : flush(now));
    }
    if (force) forceBackgroundSave = true;
    if (pendingBackgroundSave) return pendingBackgroundSave;

    const task = (async () => {
      let wroteSnapshot = false;
      let requestedAt = now;

      while (!backgroundStopped && (forceBackgroundSave || revision !== savedRevision)) {
        const forceThisAttempt = forceBackgroundSave;
        forceBackgroundSave = false;
        if (!forceThisAttempt && revision === savedRevision) break;

        const revisionBeingPrepared = revision;
        const generationBeingPrepared = persistenceGeneration;
        const stateBeingPrepared = currentState;
        let prepared: PreparedPersistence;
        try {
          prepared = await prepareInBackground(stateBeingPrepared, requestedAt);
        } catch {
          return false;
        }

        if (backgroundStopped) return wroteSnapshot;
        if (
          generationBeingPrepared !== persistenceGeneration ||
          revisionBeingPrepared !== revision
        ) {
          // Lo snapshot è già obsoleto: non tocca localStorage e riparte
          // direttamente dall'ultima revisione disponibile.
          requestedAt = Date.now();
          continue;
        }

        let committed: boolean;
        try {
          committed = prepared.commit();
        } catch {
          return false;
        }
        if (!committed) return false;
        savedRevision = revisionBeingPrepared;
        wroteSnapshot = true;
        requestedAt = Date.now();
      }

      return wroteSnapshot;
    })();

    pendingBackgroundSave = task;
    void task.then(
      () => {
        if (pendingBackgroundSave === task) pendingBackgroundSave = undefined;
      },
      () => {
        if (pendingBackgroundSave === task) pendingBackgroundSave = undefined;
      },
    );
    return task;
  };

  return {
    markDirty: (state) => {
      currentState = state;
      revision += 1;
    },
    flush,
    flushInBackground: (now = Date.now()) => queueBackgroundSave(now, false),
    saveNow,
    isDirty: () => revision !== savedRevision,
    start: (intervalMs, onNextSaveScheduled) => {
      backgroundStopped = false;
      onNextSaveScheduled?.(Date.now() + intervalMs);
      let pendingSaveId: number | undefined;
      const intervalId = window.setInterval(() => {
        const scheduledAt = Date.now();
        onNextSaveScheduled?.(Date.now() + intervalMs);
        // Lascia terminare gli altri timer di gioco scattati nello stesso
        // istante, così la fotografia include anche il loro stato più recente.
        pendingSaveId = window.setTimeout(() => {
          pendingSaveId = undefined;
          if (prepareInBackground) {
            void queueBackgroundSave(scheduledAt, true);
          } else {
            saveNow(scheduledAt);
          }
        }, 0);
      }, intervalMs);
      return () => {
        backgroundStopped = true;
        persistenceGeneration += 1;
        forceBackgroundSave = false;
        window.clearInterval(intervalId);
        if (pendingSaveId !== undefined) window.clearTimeout(pendingSaveId);
      };
    },
  };
}
