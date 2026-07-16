import { useEffect, useReducer, useRef } from "react";
import { GAME_CONFIG } from "./config";
import { gameReducer } from "./engine";
import { loadGame, saveGame } from "./save";

export function useGameEngine() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadGame());
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const tickId = window.setInterval(() => {
      if (stateRef.current.profile.displayName.trim()) {
        dispatch({ type: "TICK", now: Date.now() });
      }
    }, 250);
    return () => window.clearInterval(tickId);
  }, []);

  useEffect(() => {
    const saveId = window.setInterval(
      () => saveGame(stateRef.current),
      GAME_CONFIG.saveIntervalMs,
    );
    return () => window.clearInterval(saveId);
  }, []);

  useEffect(() => {
    const saveOnExit = () => saveGame(stateRef.current);
    window.addEventListener("beforeunload", saveOnExit);
    return () => window.removeEventListener("beforeunload", saveOnExit);
  }, []);

  const saveCheckpoint = `${state.profile.displayName}:${state.school.activeMembers}:${state.school.historicMembers}:${state.school.euros}:${state.statistics.emailsSent}:${state.statistics.trialsBooked}:${state.statistics.membersEnrolled}:${state.statistics.eventsCompleted}:${JSON.stringify(state.upgrades)}:${state.messages.filter((message) => message.unread).length}:${state.acquisitionEvents.length}`;
  useEffect(() => {
    saveGame(stateRef.current);
  }, [saveCheckpoint]);

  return { state, dispatch };
}
