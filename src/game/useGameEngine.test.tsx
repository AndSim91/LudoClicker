import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "./engine";
import { saveGame } from "./save";
import { useGameEngine } from "./useGameEngine";

describe("useGameEngine pause", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    saveGame(createInitialState(1_000, "Andrea Ungaro"), 1_000);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("keeps the game clock and every remaining duration frozen", () => {
    const { result } = renderHook(() => useGameEngine());

    act(() => vi.advanceTimersByTime(250));
    act(() => result.current.togglePause());

    const pausedAt = result.current.state.automation.lastProcessedAt;
    const remainingMonthMs = result.current.state.school.nextFeeAt - pausedAt;
    expect(result.current.isPaused).toBe(true);

    act(() => vi.advanceTimersByTime(30_000));

    expect(result.current.getGameNow()).toBe(pausedAt);
    expect(result.current.state.automation.lastProcessedAt).toBe(pausedAt);
    expect(result.current.state.school.nextFeeAt - pausedAt).toBe(remainingMonthMs);

    act(() => result.current.togglePause());

    expect(result.current.isPaused).toBe(false);
    expect(
      result.current.state.school.nextFeeAt -
      result.current.state.automation.lastProcessedAt,
    ).toBe(remainingMonthMs);
  });
});
