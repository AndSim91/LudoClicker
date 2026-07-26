import { render, renderHook, screen } from "@testing-library/react";
import { memo, type PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import {
  GameStateContext,
  GameStateProvider,
  useGameSelector,
  useGameState,
} from "./GameStateContext";

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

  it("does not render a selective consumer for unrelated runtime updates", () => {
    const state = createInitialState(1_000, "Selector Player");
    let renderCount = 0;
    const EmailsCount = memo(function EmailsCount() {
      renderCount += 1;
      const count = useGameSelector((current) => current.emails.length);
      return <span>{count}</span>;
    });
    const view = render(
      <GameStateProvider state={state}>
        <EmailsCount />
      </GameStateProvider>,
    );

    view.rerender(
      <GameStateProvider
        state={{
          ...state,
          automation: { ...state.automation, lessonBuffer: 10 },
        }}
      >
        <EmailsCount />
      </GameStateProvider>,
    );
    expect(renderCount).toBe(1);

    view.rerender(
      <GameStateProvider state={{ ...state, emails: [...state.emails, {
        ...state.emails[0],
        id: "selector-email",
      }] }}>
        <EmailsCount />
      </GameStateProvider>,
    );
    expect(screen.getByText(String(state.emails.length + 1))).toBeInTheDocument();
    expect(renderCount).toBe(2);
  });
});
