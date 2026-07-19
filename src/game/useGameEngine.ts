import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { GAME_CONFIG } from "./config";
import { gameReducer } from "./engine";
import { loadGame, saveGame } from "./save";
import { createSaveScheduler } from "./saveScheduler";

export function useGameEngine() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadGame());
  const stateRef = useRef(state);
  const observedStateRef = useRef(state);
  const [saveScheduler] = useState(() => createSaveScheduler(state, saveGame));

  useLayoutEffect(() => {
    stateRef.current = state;
    if (observedStateRef.current !== state) {
      observedStateRef.current = state;
      saveScheduler.markDirty(state);
    }
  }, [saveScheduler, state]);

  useEffect(() => {
    const tickId = window.setInterval(() => {
      if (stateRef.current.profile.displayName.trim()) {
        dispatch({ type: "TICK", now: Date.now() });
      }
    }, 250);
    return () => window.clearInterval(tickId);
  }, []);

  useEffect(() => {
    return saveScheduler.start(GAME_CONFIG.saveIntervalMs);
  }, [saveScheduler]);

  useEffect(() => {
    const saveOnExit = () => saveScheduler.flush();
    window.addEventListener("beforeunload", saveOnExit);
    return () => window.removeEventListener("beforeunload", saveOnExit);
  }, [saveScheduler]);

  return { state, dispatch };
}
