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
import { getNextGameTickDelay } from "./gameScheduler";
import type { GameAction } from "./types";

export function useGameEngine() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadGame());
  const stateRef = useRef(state);
  const observedStateRef = useRef(state);
  const pausedAtRef = useRef<number | null>(null);
  const saveSchedulerRef = useRef<SaveScheduler | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const savePausedGame = useCallback((currentState: typeof state, now = Date.now()) => {
    const pausedAt = pausedAtRef.current;
    const stateToSave = pausedAt === null
      ? currentState
      : freezeGameState(currentState, now, now - pausedAt);
    return saveGame(stateToSave, now);
  }, []);

  useLayoutEffect(() => {
    stateRef.current = state;
    if (observedStateRef.current !== state) {
      observedStateRef.current = state;
      saveSchedulerRef.current?.markDirty(state);
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
        dispatch({ type: "TICK", now: Date.now() });
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
  }, [isPaused, state]);

  useEffect(() => {
    const saveScheduler = createSaveScheduler(stateRef.current, savePausedGame);
    saveSchedulerRef.current = saveScheduler;
    const stopScheduler = saveScheduler.start(GAME_CONFIG.saveIntervalMs);
    const saveOnExit = () => saveScheduler.flush();
    window.addEventListener("beforeunload", saveOnExit);
    return () => {
      stopScheduler();
      window.removeEventListener("beforeunload", saveOnExit);
      saveSchedulerRef.current = null;
    };
  }, [savePausedGame]);

  const dispatchAction = useCallback((action: GameAction) => {
    if (action.type === "REPLACE_STATE" && pausedAtRef.current !== null) {
      pausedAtRef.current = Date.now();
    }
    dispatch(action);
  }, []);

  const getGameNow = useCallback(
    () => pausedAtRef.current ?? Date.now(),
    [],
  );

  const togglePause = useCallback(() => {
    const now = Date.now();
    const pausedAt = pausedAtRef.current;

    if (pausedAt === null) {
      dispatch({ type: "TICK", now });
      pausedAtRef.current = now;
      setIsPaused(true);
      return;
    }

    dispatch({ type: "RESUME_FROM_PAUSE", now, elapsedMs: now - pausedAt });
    pausedAtRef.current = null;
    setIsPaused(false);
  }, []);

  return {
    state,
    dispatch: dispatchAction,
    getGameNow,
    isPaused,
    togglePause,
  };
}
