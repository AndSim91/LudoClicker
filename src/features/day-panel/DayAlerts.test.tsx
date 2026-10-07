import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { GameState } from "../../game/types";
import { DAY_ALERT_MS, DayAlerts } from "./DayAlerts";

function withEvent(state: GameState, id: string, definitionId: "unexpected-repair" | "word-of-mouth", occurredAt: number): GameState {
  return {
    ...state,
    narrative: {
      ...state.narrative,
      history: [...state.narrative.history, { id, definitionId, title: `Evento ${id}`, occurredAt, summary: "" }],
    },
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("DayAlerts", () => {
  it("shows only what arrives after mount, for six seconds, and opens the giornata on tap", () => {
    vi.useFakeTimers();
    vi.setSystemTime(50_000);
    const onOpenDay = vi.fn();
    const before = withEvent(createInitialState(10_000), "old", "word-of-mouth", 49_000);
    const { rerender } = render(<DayAlerts state={before} onOpenDay={onOpenDay} />);
    expect(screen.queryByText("Evento old")).not.toBeInTheDocument();

    rerender(<DayAlerts state={withEvent(before, "new", "unexpected-repair", 50_000)} onOpenDay={onOpenDay} />);
    expect(screen.getByText("Evento new")).toBeVisible();
    expect(screen.getByText("Imprevisto")).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(DAY_ALERT_MS);
    });
    expect(screen.queryByText("Evento new")).not.toBeInTheDocument();

    rerender(<DayAlerts state={withEvent(withEvent(before, "new", "unexpected-repair", 50_000), "next", "word-of-mouth", 56_000)} onOpenDay={onOpenDay} />);
    fireEvent.click(screen.getByText("Evento next"));
    expect(onOpenDay).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Evento next")).not.toBeInTheDocument();
  });
});
