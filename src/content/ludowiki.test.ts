import { describe, expect, it } from "vitest";
import { LUDODEX_LEGENDARIES, formatLudodexNumber } from "./ludowiki";
import { SECRET_LEGENDARIES } from "./secretLegendaries";

describe("Ludodex numbers", () => {
  it("gives every Leggendario a fixed number, from #001 with no gaps or repeats", () => {
    const numbers = LUDODEX_LEGENDARIES.map((legendary) => legendary.ludodexNumber);
    expect(numbers).toEqual(Array.from({ length: numbers.length }, (_, index) => index + 1));
    expect(formatLudodexNumber(LUDODEX_LEGENDARIES.find((legendary) => legendary.id === "matteo-scarzello")!)).toBe("#005");
    expect(formatLudodexNumber(LUDODEX_LEGENDARIES.find((legendary) => legendary.id === "pietro-scarica")!)).toBe("#014");
  });

  it("numbers the Chronicles in the order of their challenges, weakest first", () => {
    const chronicles = LUDODEX_LEGENDARIES.filter((legendary) => legendary.ludodexNumber >= 26);
    const strength = (id: string) => {
      const [arena, style] = SECRET_LEGENDARIES[id as keyof typeof SECRET_LEGENDARIES].tournament;
      return arena + style;
    };
    expect(chronicles.map((legendary) => legendary.id)).toEqual(
      [...chronicles].sort((a, b) => strength(a.id) - strength(b.id)).map((legendary) => legendary.id),
    );
    expect(chronicles[0].id).toBe("debora-girelli");
  });
});
