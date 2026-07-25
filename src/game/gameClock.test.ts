import { describe, expect, it } from "vitest";
import {
  changeGameClockSpeed,
  createGameClockAnchor,
  gameDelayToWallDelay,
  normalizeGameSpeed,
  readGameClock,
} from "./gameClock";

describe("game clock", () => {
  it("advances game time at the selected speed", () => {
    const clock = createGameClockAnchor(10_000, 1_000, 100);

    expect(readGameClock(clock, 1_400)).toBe(50_000);
    expect(gameDelayToWallDelay(10_000, 100)).toBe(100);
  });

  it("keeps time continuous when its speed changes", () => {
    const initial = createGameClockAnchor(10_000, 1_000, 1);
    const accelerated = changeGameClockSpeed(initial, 1_500, 10);

    expect(readGameClock(accelerated, 1_500)).toBe(10_500);
    expect(readGameClock(accelerated, 1_600)).toBe(11_500);
  });

  it("accepts only integer speeds from 1x through 100x", () => {
    expect(normalizeGameSpeed(-5)).toBe(1);
    expect(normalizeGameSpeed(4.6)).toBe(5);
    expect(normalizeGameSpeed(500)).toBe(100);
    expect(normalizeGameSpeed(Number.NaN)).toBe(1);
  });
});
