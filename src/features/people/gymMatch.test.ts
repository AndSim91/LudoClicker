import { describe, expect, it } from "vitest";
import { rollGymCard } from "./gymMatch";

const rolls = (...values: number[]) => () => values.shift() ?? 0;

describe("gym match", () => {
  it("raises the chequered card 10% of the time and a white or yellow one another 10%", () => {
    expect(rollGymCard(rolls(0.05))).toBe("style");
    expect(rollGymCard(rolls(0.15, 0.2))).toBe("white");
    expect(rollGymCard(rolls(0.15, 0.7))).toBe("yellow");
    expect(rollGymCard(rolls(0.2))).toBeUndefined();
  });
});
