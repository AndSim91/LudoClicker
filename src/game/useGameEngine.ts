import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { GAME_CONFIG } from "./config";
import { gameReducer } from "./engine";
import { freezeGameState } from "./offline";
import { loadGame, saveGame } from "./save";
import { createSaveScheduler, type SaveScheduler } from "./saveScheduler";
import type { GameSaveStatus } from "./saveStatus";
import { getNextGameTickDelay } from "./gameScheduler";
import type { GameAction } from "./types";

type PauseReason = "manual" | "tutorial";

export function useGameEngine() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadGame());
  const stateRef = useRef(state);
  const observedStateRef = useRef(state);
  const pausedAtRef = useRef<number | null>(null);
  const pauseReasonsRef = useRef(new Set<PauseReason>());
  const saveSchedulerRef = useRef<SaveScheduler | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [saveStatus, setSaveStatus] = useState<GameSaveStatus>(() => ({
    phase: "pending",
    lastSavedAt: null,
    nextAutoSaveAt: Date.now() + GAME_CONFIG.saveIntervalMs,
  }));
  const persistGame = useCallback((currentState: typeof state, now = Date.now()) => {
    const pausedAt = pausedAtRef.current;
    const stateToSave = pausedAt === null
      ? currentState
      : freezeGameState(currentState, now, now - pausedAt);
    const saved = saveGame(stateToSave, now);
    setSaveStatus((current) => ({
      ...current,
      phase: saved ? "saved" : "error",
      lastSavedAt: saved ? now : current.lastSavedAt,
    }));
    return saved;
  }, []);

  const dispatchAction = useCallback((action: GameAction) => {
    if (action.type === "REPLACE_STATE" && pausedAtRef.current !== null) {
      pausedAtRef.current = Date.now();
    }
    dispatch(action);
  }, []);

  useLayoutEffect(() => {
    stateRef.current = state;
    if (observedStateRef.current !== state) {
      observedStateRef.current = state;
      saveSchedulerRef.current?.markDirty(state);
      setSaveStatus((current) => ({
        ...current,
        phase: current.phase === "error" ? "error" : "pending",
      }));
    }
  }, [state]);

  useEffect(() => {
    if (isPaused || !state.profile.displayName.trim()) return;
    let tickId: number | undefined;
    let followUpId: number | undefined;
    let cancelled = false;

    const schedule = (minimumDelay = 0) => {
      if (cancelled || pausedAtRef.current !== null) return;
      const now = Date.now();
      const delay = Math.max(
        minimumDelay,
        getNextGameTickDelay(stateRef.current, now),
      );
      tickId = window.setTimeout(() => {
        if (cancelled || pausedAtRef.current !== null) return;
        const stateBeforeTick = stateRef.current;
        dispatchAction({ type: "TICK", now: Date.now() });
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
  }, [dispatchAction, isPaused, state]);

  useEffect(() => {
    const saveScheduler = createSaveScheduler(stateRef.current, persistGame);
    saveSchedulerRef.current = saveScheduler;
    const stopScheduler = saveScheduler.start(
      GAME_CONFIG.saveIntervalMs,
      (nextAutoSaveAt) => setSaveStatus((current) => ({
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

  const saveNow = useCallback(
    () => saveSchedulerRef.current?.saveNow() ?? false,
    [],
  );

  const getGameNow = useCallback(
    () => pausedAtRef.current ?? Date.now(),
    [],
  );

  const setPauseReason = useCallback((reason: PauseReason, shouldPause: boolean) => {
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

    const now = Date.now();
    const pausedAt = pausedAtRef.current;

    if (remainsPaused && pausedAt === null) {
      dispatchAction({ type: "TICK", now });
      pausedAtRef.current = now;
      setIsPaused(true);
      return;
    }

    if (pausedAt === null) return;
    dispatchAction({ type: "RESUME_FROM_PAUSE", now, elapsedMs: now - pausedAt });
    pausedAtRef.current = null;
    setIsPaused(false);
  }, [dispatchAction]);

  const togglePause = useCallback(() => {
    const reasons = pauseReasonsRef.current;
    if (reasons.has("manual")) {
      setPauseReason("manual", false);
      return;
    }
    if (reasons.has("tutorial")) return;
    setPauseReason("manual", true);
  }, [setPauseReason]);

  const setTutorialPaused = useCallback((paused: boolean) => {
    setPauseReason("tutorial", paused);
  }, [setPauseReason]);

  return {
    state,
    dispatch: dispatchAction,
    getGameNow,
    isPaused,
    togglePause,
    setTutorialPaused,
    saveStatus,
    saveNow,
  };
}
