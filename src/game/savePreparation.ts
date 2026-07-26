import { GAME_CONFIG } from "./config";
import { rebaseGameTimeline } from "./gameTimeline";
import { encodeStoredSave } from "./saveCodec";
import { createSaveFailure, type SaveFailure } from "./saveDiagnostics";
import type { GameState } from "./types";

export type PreparedGameSaveResult =
  | { ok: true; serialized: string }
  | { ok: false; error: SaveFailure };

/**
 * Prepara esattamente il formato persistito esistente. Tenere questa fase pura
 * permette di eseguirla sia sul thread principale sia in un Web Worker.
 */
export function prepareStoredGameSave(
  state: GameState,
  now = Date.now(),
): PreparedGameSaveResult {
  try {
    return {
      ok: true,
      serialized: encodeStoredSave({
        ...state,
        saveCompatibilityVersion: GAME_CONFIG.saveCompatibilityVersion,
        lastSavedAt: now,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      error: createSaveFailure("serialize", error, null),
    };
  }
}

export function prepareRebasedGameSave(
  state: GameState,
  gameNow: number,
  wallNow: number,
): PreparedGameSaveResult {
  try {
    return prepareStoredGameSave(
      rebaseGameTimeline(state, gameNow, wallNow),
      wallNow,
    );
  } catch (error) {
    return {
      ok: false,
      error: createSaveFailure("serialize", error, null),
    };
  }
}
