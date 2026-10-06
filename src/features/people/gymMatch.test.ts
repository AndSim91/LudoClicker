import { describe, expect, it } from "vitest";
import { addGymPoint, applyGymCard, isGymMatchOver, rollGymCard } from "./gymMatch";

const rolls = (...values: number[]) => () => values.shift() ?? 0;

describe("gym match", () => {
  it("raises the chequered card 10% of the time and a white or yellow one another 10%", () => {
    expect(rollGymCard(rolls(0.05))).toBe("style");
    expect(rollGymCard(rolls(0.15, 0.2))).toBe("white");
    expect(rollGymCard(rolls(0.15, 0.7))).toBe("yellow");
    expect(rollGymCard(rolls(0.2))).toBeUndefined();
  });

  it("keeps, cancels or hands over the point", () => {
    const scored = addGymPoint({ a: 1, b: 1 }, "a");
    expect(scored).toEqual({ a: 2, b: 1 });
    expect(applyGymCard(scored, "a", "style")).toEqual({ a: 2, b: 1 });
    expect(applyGymCard(scored, "a", "white")).toEqual({ a: 1, b: 1 });
    expect(applyGymCard(scored, "a", "yellow")).toEqual({ a: 1, b: 2 });
  });

  it("ends the best of 5 at 3", () => {
    expect(isGymMatchOver({ a: 2, b: 2 })).toBe(false);
    expect(isGymMatchOver({ a: 1, b: 3 })).toBe(true);
  });
});
