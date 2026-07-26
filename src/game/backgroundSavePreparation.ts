import { createSaveFailure } from "./saveDiagnostics";
import {
  prepareRebasedGameSave,
  type PreparedGameSaveResult,
} from "./savePreparation";
import type { GameState } from "./types";
import type {
  PrepareGameSaveRequest,
  PrepareGameSaveResponse,
} from "./saveWorkerProtocol";

interface IdleWindow {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

interface PendingPreparation {
  request: PrepareGameSaveRequest;
  resolve: (result: PreparedGameSaveResult) => void;
  cancelSchedule?: () => void;
}

export interface BackgroundSavePreparer {
  prepare: (
    state: GameState,
    gameNow: number,
    wallNow: number,
  ) => Promise<PreparedGameSaveResult>;
  dispose: () => void;
}

function scheduleWhenIdle(callback: () => void): () => void {
  const idleWindow = window as unknown as IdleWindow;
  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 1_000 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, 0);
  return () => window.clearTimeout(handle);
}

function preparationFailure(error: unknown): PreparedGameSaveResult {
  return {
    ok: false,
    error: createSaveFailure("serialize", error, null),
  };
}

function createWorker(): Worker | undefined {
  if (typeof Worker === "undefined") return undefined;
  try {
    return new Worker(new URL("./saveWorker.ts", import.meta.url), { type: "module" });
  } catch {
    return undefined;
  }
}

/**
 * Usa un Worker quando disponibile. Il fallback resta asincrono e parte in un
 * momento idle: serve per browser/test senza Worker e non cambia il codec.
 */
export function createBackgroundSavePreparer(): BackgroundSavePreparer {
  let worker = createWorker();
  let nextRequestId = 1;
  let disposed = false;
  const pending = new Map<number, PendingPreparation>();

  const complete = (id: number, result: PreparedGameSaveResult) => {
    const preparation = pending.get(id);
    if (!preparation) return;
    pending.delete(id);
    preparation.resolve(result);
  };

  const prepareOnMainThread = (preparation: PendingPreparation) => {
    preparation.cancelSchedule = scheduleWhenIdle(() => {
      preparation.cancelSchedule = undefined;
      if (disposed) {
        complete(preparation.request.id, preparationFailure(new Error("Save preparer disposed")));
        return;
      }
      complete(
        preparation.request.id,
        prepareRebasedGameSave(
          preparation.request.state,
          preparation.request.gameNow,
          preparation.request.wallNow,
        ),
      );
    });
  };

  if (worker) {
    worker.addEventListener("message", (event: MessageEvent<PrepareGameSaveResponse>) => {
      complete(event.data.id, event.data.result);
    });
    worker.addEventListener("error", (event) => {
      const failedWorker = worker;
      worker = undefined;
      failedWorker?.terminate();
      for (const preparation of pending.values()) {
        if (!preparation.cancelSchedule) prepareOnMainThread(preparation);
      }
      event.preventDefault();
    });
  }

  return {
    prepare: (state, gameNow, wallNow) =>
      new Promise((resolve) => {
        const request: PrepareGameSaveRequest = {
          id: nextRequestId,
          state,
          gameNow,
          wallNow,
        };
        nextRequestId += 1;
        const preparation: PendingPreparation = { request, resolve };
        pending.set(request.id, preparation);
        preparation.cancelSchedule = scheduleWhenIdle(() => {
          preparation.cancelSchedule = undefined;
          if (disposed) {
            complete(request.id, preparationFailure(new Error("Save preparer disposed")));
            return;
          }
          if (!worker) {
            complete(request.id, prepareRebasedGameSave(state, gameNow, wallNow));
            return;
          }
          try {
            worker.postMessage(request);
          } catch (error) {
            complete(request.id, preparationFailure(error));
          }
        });
      }),
    dispose: () => {
      disposed = true;
      worker?.terminate();
      worker = undefined;
      for (const preparation of pending.values()) {
        preparation.cancelSchedule?.();
        preparation.resolve(preparationFailure(new Error("Save preparer disposed")));
      }
      pending.clear();
    },
  };
}
