import { describe, expect, it } from "vitest";
import { LUDODEX_LEGENDARIES, formatLudodexNumber } from "./ludowiki";

describe("Ludodex numbers", () => {
  it("gives every Leggendario a fixed number, from #001 with no gaps or repeats", () => {
    const numbers = LUDODEX_LEGENDARIES.map((legendary) => legendary.ludodexNumber);
    expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, index) => index + 1));
    expect(formatLudodexNumber(LUDODEX_LEGENDARIES.find((legendary) => legendary.id === "matteo-scarzello")!)).toBe("#005");
    expect(formatLudodexNumber(LUDODEX_LEGENDARIES.find((legendary) => legendary.id === "pietro-scarica")!)).toBe("#014");
  });
});
