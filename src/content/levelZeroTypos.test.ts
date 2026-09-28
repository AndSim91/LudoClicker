import { expect, it } from "vitest";
import { addLevelZeroTypos } from "./levelZeroTypos";

it("adds known errors with their exact positions and respects case and names", () => {
  const source = "Ciao Giulia, perché non vieni in palestra? Abbiamo le spade e c'è anche un po' di posto.";
  const { text, ranges } = addLevelZeroTypos(source, "seed", { protectedWords: ["Giulia"] });
  expect(text).toContain("Giulia");
  expect(ranges.length).toBeGreaterThanOrEqual(4);
  for (const [start, end] of ranges) {
    const typo = text.slice(start, end);
    expect(typo.length).toBeGreaterThan(0);
    expect(source).not.toContain(` ${typo} `);
  }
  expect(addLevelZeroTypos(source, "seed", { protectedWords: ["Giulia"] }).text).toBe(text);
  expect(addLevelZeroTypos("PROVA GRATIS", "s", { minimum: 1 }).text).toMatch(/^[A-Z' ]+$/u);
});
