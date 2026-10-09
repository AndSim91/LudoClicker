import { describe, expect, it } from "vitest";
import { getLegendaryEncounterMultiplier } from "./contacts";
import { createInitialCareerStatistics } from "./career";
import type { GameState } from "./types";

function state(legendaries: number, reputation: number) {
  return {
    legendaryCollaborators: {
      enrolledProfileIds: Array.from({ length: legendaries }, (_, index) => `l${index}`),
    },
    statistics: { career: { ...createInitialCareerStatistics(), reputationEarned: reputation } },
  } as unknown as Pick<GameState, "legendaryCollaborators" | "statistics">;
}

describe("Leggendari in squadra e Reputazione (09/10)", () => {
  it("toglie il 25% per ogni Leggendario oltre il primo", () => {
    expect(getLegendaryEncounterMultiplier(state(0, 0))).toBe(1);
    expect(getLegendaryEncounterMultiplier(state(1, 0))).toBe(1);
    expect(getLegendaryEncounterMultiplier(state(2, 0))).toBeCloseTo(0.75);
    expect(getLegendaryEncounterMultiplier(state(8, 0))).toBeCloseTo(0.75 ** 7);
  });

  it("la Reputazione annulla il malus a 25 punti e raddoppia la base a 50", () => {
    expect(getLegendaryEncounterMultiplier(state(8, 10))).toBeCloseTo(0.75 ** (7 * 0.6));
    expect(getLegendaryEncounterMultiplier(state(8, 25))).toBe(1);
    expect(getLegendaryEncounterMultiplier(state(8, 35))).toBeCloseTo(1.4);
    expect(getLegendaryEncounterMultiplier(state(8, 50))).toBe(2);
    expect(getLegendaryEncounterMultiplier(state(8, 400))).toBe(2);
  });
});
