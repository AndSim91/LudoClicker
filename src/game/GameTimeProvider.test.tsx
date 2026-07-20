import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGameTime } from "./GameTimeContext";
import { GameTimeProvider } from "./GameTimeProvider";

function ClockProbe({ label = "Tempo di gioco" }: { label?: string }) {
  const now = useGameTime(true, 1_000);
  return <output aria-label={label}>{now}</output>;
}

describe("GameTimeProvider", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("updates visual time independently and freezes it while paused", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    let pausedAt: number | null = null;
    const getNow = () => pausedAt ?? Date.now();
    const { rerender } = render(
      <GameTimeProvider getNow={getNow} isPaused={false}>
        <ClockProbe />
      </GameTimeProvider>,
    );

    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByLabelText("Tempo di gioco")).toHaveTextContent("1000");

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByLabelText("Tempo di gioco")).toHaveTextContent("2000");

    vi.setSystemTime(2_500);
    pausedAt = 2_500;
    rerender(
      <GameTimeProvider getNow={getNow} isPaused>
        <ClockProbe />
      </GameTimeProvider>,
    );
    expect(screen.getByLabelText("Tempo di gioco")).toHaveTextContent("2500");

    vi.setSystemTime(9_000);
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByLabelText("Tempo di gioco")).toHaveTextContent("2500");
  });

  it("shares one interval between visual clock consumers", () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    render(
      <GameTimeProvider getNow={() => Date.now()} isPaused={false}>
        <ClockProbe label="Primo clock" />
        <ClockProbe label="Secondo clock" />
      </GameTimeProvider>,
    );

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });
});
