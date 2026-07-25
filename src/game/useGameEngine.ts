import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { GAME_CONFIG } from "./config";
import { gameReducer } from "./engine";
import {
  changeGameClockSpeed,
  createGameClockAnchor,
  gameDelayToWallDelay,
  normalizeGameSpeed,
  readGameClock,
} from "./gameClock";
import { rebaseGameTimeline } from "./gameTimeline";
import { loadGame, trySaveGame } from "./save";
import { createSaveScheduler, type SaveScheduler } from "./saveScheduler";
import type { GameSaveStatus } from "./saveStatus";
import { getNextGameTickDelay } from "./gameScheduler";
import type { GameAction } from "./types";

type PauseReason = "manual" | "tutorial";

export function useGameEngine() {
  const [initialWallNow] = useState(() => Date.now());
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadGame(initialWallNow));
  const stateRef = useRef(state);
  const observedStateRef = useRef(state);
  const pausedAtRef = useRef<number | null>(null);
  const pauseReasonsRef = useRef(new Set<PauseReason>());
  const saveSchedulerRef = useRef<SaveScheduler | null>(null);
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

  const getPersistableState = useCallback(
    (currentState = stateRef.current, wallNow = Date.now()) =>
      rebaseGameTimeline(currentState, getGameNowAt(wallNow), wallNow),
    [getGameNowAt],
  );

  const persistGame = useCallback(
    (currentState: typeof state, wallNow = Date.now()) => {
      const result = trySaveGame(getPersistableState(currentState, wallNow), wallNow);
      setSaveStatus((current) => ({
        ...current,
        phase: result.ok ? "saved" : "error",
        lastSavedAt: result.ok ? wallNow : current.lastSavedAt,
        error: result.ok ? null : result.error,
      }));
      return result.ok;
    },
    [getPersistableState],
  );

  const dispatchAction = useCallback((action: GameAction) => {
    if (action.type === "REPLACE_STATE") {
      const wallNow = Date.now();
      clockRef.current = createGameClockAnchor(
        action.state.lastSavedAt,
        wallNow,
        clockRef.current.speed,
      );
      if (pausedAtRef.current !== null) {
        pausedAtRef.current = action.state.lastSavedAt;
      }
    }
    dispatch(action);
  }, []);

  useLayoutEffect(() => {
    stateRef.current = state;
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
    if (isPaused || !state.profile.displayName.trim()) return;
    let tickId: number | undefined;
    let followUpId: number | undefined;
    let cancelled = false;

    const schedule = (minimumGameDelay = 0) => {
      if (cancelled || pausedAtRef.current !== null) return;
      const now = getGameNow();
      const delay = Math.max(
        gameDelayToWallDelay(minimumGameDelay, gameSpeed),
        getNextGameTickDelay(stateRef.current, now, gameSpeed),
      );
      tickId = window.setTimeout(() => {
        if (cancelled || pausedAtRef.current !== null) return;
        const stateBeforeTick = stateRef.current;
        dispatchAction({ type: "TICK", now: getGameNow() });
        // React aggiorna stateRef nel layout effect. Il follow-up mantiene vivo
        // lo scheduler anche quando un tick intenzionalmente restituisce lo
        // stesso oggetto di stato.
        followUpId = window.setTimeout(
          () => schedule(stateRef.current === stateBeforeTick ? 250 : 0),
          0,
        );
      }, delay);
    };

    schedule();
    return () => {
      cancelled = true;
      if (tickId !== undefined) window.clearTimeout(tickId);
      if (followUpId !== undefined) window.clearTimeout(followUpId);
    };
  }, [dispatchAction, gameSpeed, getGameNow, isPaused, state]);

  useEffect(() => {
    const saveScheduler = createSaveScheduler(stateRef.current, persistGame);
    saveSchedulerRef.current = saveScheduler;
    const stopScheduler = saveScheduler.start(GAME_CONFIG.saveIntervalMs, (nextAutoSaveAt) =>
      setSaveStatus((current) => ({
        ...current,
        nextAutoSaveAt,
      })),
    );
    saveScheduler.flush();
    const saveOnExit = () => saveScheduler.saveNow();
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") saveScheduler.saveNow();
    };
    window.addEventListener("beforeunload", saveOnExit);
    window.addEventListener("pagehide", saveOnExit);
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      stopScheduler();
      window.removeEventListener("beforeunload", saveOnExit);
      window.removeEventListener("pagehide", saveOnExit);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      if (saveSchedulerRef.current === saveScheduler) {
        saveSchedulerRef.current = null;
      }
    };
  }, [persistGame]);

  const saveNow = useCallback(() => saveSchedulerRef.current?.saveNow() ?? false, []);

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
        dispatchAction({ type: "TICK", now: gameNow });
        pausedAtRef.current = gameNow;
        setIsPaused(true);
        return;
      }

      if (pausedAt === null) return;
      clockRef.current = createGameClockAnchor(pausedAt, wallNow, clockRef.current.speed);
      pausedAtRef.current = null;
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
