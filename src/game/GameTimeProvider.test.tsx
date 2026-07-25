import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GAME_CONFIG } from "./config";
import { useGameTime } from "./GameTimeContext";
import { GameTimeProvider } from "./GameTimeProvider";

function ClockProbe({ label = "Tempo di gioco" }: { label?: string }) {
  const now = useGameTime(true, GAME_CONFIG.progressUpdateIntervalMs);
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

    act(() => vi.advanceTimersByTime(GAME_CONFIG.progressUpdateIntervalMs));
    expect(screen.getByLabelText("Tempo di gioco")).toHaveTextContent("1250");

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
    expect(setIntervalSpy).toHaveBeenCalledWith(
      expect.any(Function),
      GAME_CONFIG.progressUpdateIntervalMs,
    );
  });

  it("renders the virtual clock supplied by the game engine", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const getNow = () => 1_000 + (Date.now() - 1_000) * 100;
    render(
      <GameTimeProvider getNow={getNow} isPaused={false} speed={100}>
        <ClockProbe />
      </GameTimeProvider>,
    );

    act(() => vi.advanceTimersByTime(GAME_CONFIG.progressUpdateIntervalMs));

    expect(screen.getByLabelText("Tempo di gioco")).toHaveTextContent("26000");
  });
});
