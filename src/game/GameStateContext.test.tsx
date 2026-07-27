import { render, renderHook, screen } from "@testing-library/react";
import { memo, useEffect, type PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { createInitialState } from "./engine";
import type { GameState } from "./types";
import {
  GameStateContext,
  GameStateStoreProvider,
  useGameSelector,
  useGameState,
  useGameStateStore,
} from "./GameStateContext";

function StableStoreHarness({
  state,
  children,
}: PropsWithChildren<{ state: GameState }>) {
  const store = useGameStateStore(state);
  return <GameStateStoreProvider value={store}>{children}</GameStateStoreProvider>;
}

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

  it("publishes through the stable store without rendering unrelated consumers", () => {
    const state = createInitialState(1_000, "Selector Player");
    const onRender = vi.fn();
    const EmailsCount = memo(function EmailsCount() {
      const count = useGameSelector((current) => current.emails.length);
      useEffect(() => onRender());
      return <span>{count}</span>;
    });
    const view = render(
      <StableStoreHarness state={state}>
        <EmailsCount />
      </StableStoreHarness>,
    );

    view.rerender(
      <StableStoreHarness
        state={{
          ...state,
          automation: { ...state.automation, lessonBuffer: 10 },
        }}
      >
        <EmailsCount />
      </StableStoreHarness>,
    );
    expect(onRender).toHaveBeenCalledTimes(1);

    view.rerender(
      <StableStoreHarness state={{ ...state, emails: [...state.emails, {
        ...state.emails[0],
        id: "selector-email",
      }] }}>
        <EmailsCount />
      </StableStoreHarness>,
    );
    expect(screen.getByText(String(state.emails.length + 1))).toBeInTheDocument();
    expect(onRender).toHaveBeenCalledTimes(2);
  });
});
