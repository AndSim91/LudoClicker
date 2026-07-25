import { renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { GameStateContext, useGameState } from "./GameStateContext";

describe("GameStateContext", () => {
  it("shares the game state without forwarding it as a component prop", () => {
    const state = createInitialState(1_000, "Context Player");
    const wrapper = ({ children }: PropsWithChildren) => (
      <GameStateContext.Provider value={state}>{children}</GameStateContext.Provider>
    );

    const { result } = renderHook(() => useGameState(), { wrapper });

    expect(result.current).toBe(state);
  });

  it("prefers an explicit state override for isolated component tests", () => {
    const contextState = createInitialState(1_000, "Context Player");
    const override = createInitialState(2_000, "Isolated Test Player");
    const wrapper = ({ children }: PropsWithChildren) => (
      <GameStateContext.Provider value={contextState}>{children}</GameStateContext.Provider>
    );

    const { result } = renderHook(() => useGameState(override), { wrapper });

    expect(result.current).toBe(override);
  });
});
