import { createContext, useContext } from "react";
import type { GameState } from "./types";

export const GameStateContext = createContext<GameState | null>(null);

/**
 * Reads the current game state without forwarding it through component props.
 * The optional override keeps leaf components independently testable.
 */
export function useGameState(override?: GameState): GameState {
  const contextState = useContext(GameStateContext);
  const state = override ?? contextState;

  if (!state) {
    throw new Error("Game state is unavailable: render inside GameStateContext or provide state.");
  }

  return state;
}
