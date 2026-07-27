import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { GAME_CONFIG } from "./config";
import {
  MAX_CATCH_UP_STEPS_PER_TICK,
  MAX_SIMULTANEOUS_WORK_PER_SLICE,
  gameReducer,
} from "./engine";
import {
  changeGameClockSpeed,
  createGameClockAnchor,
  gameDelayToWallDelay,
  normalizeGameSpeed,
  readGameClock,
} from "./gameClock";
import { rebaseGameTimeline } from "./gameTimeline";
import { createBackgroundSavePreparer } from "./backgroundSavePreparation";
import { loadGame, trySaveGame, writePreparedGameSave } from "./save";
import type { SaveGameResult } from "./saveDiagnostics";
import { createSaveScheduler, type SaveScheduler } from "./saveScheduler";
import type { GameSaveStatus } from "./saveStatus";
import { getNextGameTickDelay, hasQueuedGameWorkAt } from "./gameScheduler";
import { postponeLightInflationEvent } from "./lightInflation";
import { crashReporter } from "./crashReporting";
import type { GameAction } from "./types";

type PauseReason = "manual" | "tutorial";

interface PauseDrainRequest {
  gameNow: number;
  wallNow: number;
}

export function useGameEngine() {
  const [initialWallNow] = useState(() => Date.now());
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadGame(initialWallNow));
  const stateRef = useRef(state);
  const observedStateRef = useRef(state);
  const pausedAtRef = useRef<number | null>(null);
  const pausedWallAtRef = useRef<number | null>(null);
  const pauseReasonsRef = useRef(new Set<PauseReason>());
  const pauseDrainRef = useRef<PauseDrainRequest | null>(null);
  const saveSchedulerRef = useRef<SaveScheduler | null>(null);
  const requestTickRescheduleRef = useRef<(() => void) | null>(null);
  const clockRef = useRef(createGameClockAnchor(state.lastSavedAt, initialWallNow));
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeedState] = useState(1);
  const [saveStatus, setSaveStatus] = useState<GameSaveStatus>(() => ({
    phase: "pending",
    lastSavedAt: null,
    nextAutoSaveAt: initialWallNow + GAME_CONFIG.saveIntervalMs,
    error: null,
  }));

  const getGameNowAt = useCallback(
    (wallNow: number) => pausedAtRef.current ?? readGameClock(clockRef.current, wallNow),
    [],
  );

  const getGameNow = useCallback(() => getGameNowAt(Date.now()), [getGameNowAt]);

  const getWallNow = useCallback(
    () => pausedWallAtRef.current ?? Date.now(),
    [],
  );

  const getPersistableState = useCallback(
    (currentState = stateRef.current, wallNow = Date.now()) => {
      const rebased = rebaseGameTimeline(currentState, getGameNowAt(wallNow), wallNow);
      const pausedWallAt = pausedWallAtRef.current;
      return pausedWallAt === null
        ? rebased
        : postponeLightInflationEvent(rebased, wallNow - pausedWallAt);
    },
    [getGameNowAt],
  );

  const reportSaveResult = useCallback(
    (result: SaveGameResult, wallNow: number) => {
      setSaveStatus((current) => ({
        ...current,
        phase: result.ok ? "saved" : "error",
        lastSavedAt: result.ok ? wallNow : current.lastSavedAt,
        error: result.ok ? null : result.error,
      }));
      return result.ok;
    },
    [],
  );

  const persistGame = useCallback(
    (currentState: typeof state, wallNow = Date.now()) => {
      const result = trySaveGame(getPersistableState(currentState, wallNow), wallNow);
      return reportSaveResult(result, wallNow);
    },
    [getPersistableState, reportSaveResult],
  );

  const dispatchAction = useCallback((action: GameAction) => {
    crashReporter.recordAction(action);
    if (action.type === "REPLACE_STATE") {
      const wallNow = Date.now();
      clockRef.current = createGameClockAnchor(
        action.state.lastSavedAt,
        wallNow,
        clockRef.current.speed,
      );
      if (pausedAtRef.current !== null) {
        pausedAtRef.current = action.state.lastSavedAt;
        pausedWallAtRef.current = wallNow;
        pauseDrainRef.current = {
          gameNow: action.state.lastSavedAt,
          wallNow,
        };
      }
    }
    dispatch(action);
  }, []);

  useLayoutEffect(() => {
    stateRef.current = state;
    crashReporter.updateGameState(state);
    requestTickRescheduleRef.current?.();
    if (observedStateRef.current !== state) {
      observedStateRef.current = state;
      saveSchedulerRef.current?.markDirty(state);
      setSaveStatus((current) => {
        const phase = current.phase === "error" ? "error" : "pending";
        return current.phase === phase ? current : { ...current, phase };
      });
    }
  }, [state]);

  useEffect(() => {
    crashReporter.updateRuntimeState(gameSpeed, isPaused);
  }, [gameSpeed, isPaused]);

  const hasProfile = Boolean(state.profile.displayName.trim());

  useEffect(() => {
    if (isPaused || !hasProfile) return;
    let tickId: number | undefined;
    let followUpId: number | undefined;
    let scheduledWallAt = Infinity;
    let cancelled = false;

    const schedule = (minimumGameDelay = 0) => {
      if (cancelled || pausedAtRef.current !== null) return;
      const now = getGameNow();
      const delay = Math.max(
        gameDelayToWallDelay(minimumGameDelay, gameSpeed),
        getNextGameTickDelay(stateRef.current, now, gameSpeed),
      );
      const nextWallAt = Date.now() + delay;
      // Unrelated state updates must not restart or postpone the current deadline.
      if (tickId !== undefined && nextWallAt >= scheduledWallAt - 1) return;
      if (tickId !== undefined) window.clearTimeout(tickId);
      scheduledWallAt = nextWallAt;
      tickId = window.setTimeout(() => {
        tickId = undefined;
        scheduledWallAt = Infinity;
        if (cancelled || pausedAtRef.current !== null) return;
        const stateBeforeTick = stateRef.current;
        const wallNow = Date.now();
        dispatchAction({
          type: "TICK",
          now: getGameNowAt(wallNow),
          wallNow,
          stepBudget: MAX_CATCH_UP_STEPS_PER_TICK,
          workBudget: MAX_SIMULTANEOUS_WORK_PER_SLICE,
        });
        // React aggiorna stateRef nel layout effect. Il follow-up mantiene vivo
        // lo scheduler anche quando un tick intenzionalmente restituisce lo
        // stesso oggetto di stato.
        followUpId = window.setTimeout(
          () => schedule(stateRef.current === stateBeforeTick ? 250 : 0),
          0,
        );
      }, delay);
    };

    const requestReschedule = () => schedule();
    requestTickRescheduleRef.current = requestReschedule;
    schedule();
    return () => {
      cancelled = true;
      if (requestTickRescheduleRef.current === requestReschedule) {
        requestTickRescheduleRef.current = null;
      }
      if (tickId !== undefined) window.clearTimeout(tickId);
      if (followUpId !== undefined) window.clearTimeout(followUpId);
    };
  }, [dispatchAction, gameSpeed, getGameNow, getGameNowAt, hasProfile, isPaused]);

  useEffect(() => {
    const backgroundPreparer = createBackgroundSavePreparer();
    const saveScheduler = createSaveScheduler(
      stateRef.current,
      persistGame,
      async (currentState, wallNow) => {
        const pausedWallAt = pausedWallAtRef.current;
        const stateForSave = pausedWallAt === null
          ? currentState
          : postponeLightInflationEvent(currentState, wallNow - pausedWallAt);
        const result = await backgroundPreparer.prepare(
          stateForSave,
          getGameNowAt(wallNow),
          wallNow,
        );
        return {
          commit: () => reportSaveResult(
            result.ok ? writePreparedGameSave(result.serialized) : result,
            wallNow,
          ),
        };
      },
    );
    saveSchedulerRef.current = saveScheduler;
    const stopScheduler = saveScheduler.start(GAME_CONFIG.saveIntervalMs, (nextAutoSaveAt) =>
      setSaveStatus((current) => ({
        ...current,
        nextAutoSaveAt,
      })),
    );
    void saveScheduler.flushInBackground();
    const saveOnExit = () => saveScheduler.saveNow();
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") saveScheduler.saveNow();
    };
    window.addEventListener("beforeunload", saveOnExit);
    window.addEventListener("pagehide", saveOnExit);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      stopScheduler();
      backgroundPreparer.dispose();
      window.removeEventListener("beforeunload", saveOnExit);
      window.removeEventListener("pagehide", saveOnExit);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      if (saveSchedulerRef.current === saveScheduler) {
        saveSchedulerRef.current = null;
      }
    };
  }, [getGameNowAt, persistGame, reportSaveResult]);

  const saveNow = useCallback(() => saveSchedulerRef.current?.saveNow() ?? false, []);

  useEffect(() => {
    const drain = pauseDrainRef.current;
    if (!isPaused || drain === null) return;
    if (!hasQueuedGameWorkAt(state, drain.gameNow)) {
      pauseDrainRef.current = null;
      return;
    }

    const drainId = window.setTimeout(() => {
      if (pauseDrainRef.current !== drain || pausedAtRef.current !== drain.gameNow) return;
      dispatchAction({
        type: "TICK",
        now: drain.gameNow,
        wallNow: drain.wallNow,
        stepBudget: MAX_CATCH_UP_STEPS_PER_TICK,
        workBudget: MAX_SIMULTANEOUS_WORK_PER_SLICE,
        allowAutomaticEventStarts: false,
      });
    }, 0);
    return () => window.clearTimeout(drainId);
  }, [dispatchAction, isPaused, state]);

  const setPauseReason = useCallback(
    (reason: PauseReason, shouldPause: boolean) => {
      const reasons = pauseReasonsRef.current;
      const wasPaused = reasons.size > 0;
      if (shouldPause) {
        if (reasons.has(reason)) return;
        reasons.add(reason);
      } else {
        if (!reasons.delete(reason)) return;
      }

      const remainsPaused = reasons.size > 0;
      if (wasPaused === remainsPaused) return;

      const wallNow = Date.now();
      const pausedAt = pausedAtRef.current;

      if (remainsPaused && pausedAt === null) {
        const gameNow = getGameNowAt(wallNow);
        pausedAtRef.current = gameNow;
        pausedWallAtRef.current = wallNow;
        pauseDrainRef.current = { gameNow, wallNow };
        setIsPaused(true);
        return;
      }

      if (pausedAt === null) return;
      const pausedWallAt = pausedWallAtRef.current;
      if (pausedWallAt !== null) {
        dispatchAction({
          type: "RESUME_FROM_PAUSE",
          now: pausedAt,
          elapsedMs: wallNow - pausedWallAt,
        });
      }
      clockRef.current = createGameClockAnchor(pausedAt, wallNow, clockRef.current.speed);
      pausedAtRef.current = null;
      pausedWallAtRef.current = null;
      pauseDrainRef.current = null;
      setIsPaused(false);
    },
    [dispatchAction, getGameNowAt],
  );

  const setGameSpeed = useCallback((speed: number) => {
    const normalizedSpeed = normalizeGameSpeed(speed);
    const wallNow = Date.now();
    clockRef.current =
      pausedAtRef.current === null
        ? changeGameClockSpeed(clockRef.current, wallNow, normalizedSpeed)
        : createGameClockAnchor(pausedAtRef.current, wallNow, normalizedSpeed);
    setGameSpeedState(normalizedSpeed);
  }, []);

  const togglePause = useCallback(() => {
    const reasons = pauseReasonsRef.current;
    if (reasons.has("manual")) {
      setPauseReason("manual", false);
      return;
    }
    if (reasons.has("tutorial")) return;
    setPauseReason("manual", true);
  }, [setPauseReason]);

  const setTutorialPaused = useCallback(
    (paused: boolean) => {
      setPauseReason("tutorial", paused);
    },
    [setPauseReason],
  );

  return {
    state,
    dispatch: dispatchAction,
    getGameNow,
    getWallNow,
    getPersistableState,
    gameSpeed,
    setGameSpeed,
    isPaused,
    togglePause,
    setTutorialPaused,
    saveStatus,
    saveNow,
  };
}
