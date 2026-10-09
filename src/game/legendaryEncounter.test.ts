import { describe, expect, it } from "vitest";
import { getCouncilBoost, getLegendaryEncounterMultiplier } from "./contacts";
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

describe("Spinta verso il Consiglio (09/10)", () => {
  const base = {
    network: { schoolCount: 0 },
    tournaments: { firstSchoolTournamentMonth: 10 },
    school: { currentMonth: 19 },
    collaborators: [{ contactId: "c1" }, { contactId: "c2" }],
    contacts: [
      { id: "c1", rarity: "legendary", status: "enrolled" },
      { id: "c2", rarity: "legendary", status: "enrolled" },
      { id: "u0", rarity: "ultra-rare", status: "enrolled", forms: [] },
      { id: "u1", rarity: "ultra-rare", status: "enrolled", forms: ["form-1"] },
      { id: "u2", rarity: "ultra-rare", status: "enrolled", forms: ["form-1", "form-2"] },
      { id: "ux", rarity: "ultra-rare", status: "lost", forms: [] },
    ],
  };
  const boost = (patch: object = {}) =>
    getCouncilBoost({ ...base, ...patch } as unknown as Parameters<typeof getCouncilBoost>[0]);

  it("+1% ogni mese dal primo Scolastico, ridotto da collaboratori e Ultra Rari", () => {
    // 9 mesi = 9%; riduzione 2 × 12,5% + 5% + 7,5% + 10% = 47,5%.
    expect(boost()).toBeCloseTo(0.09 * 0.525);
    expect(boost({ school: { currentMonth: 10 } })).toBe(0);
  });

  it("niente bonus prima dello Scolastico, dopo la prima scuola o con 8 collaboratori", () => {
    expect(boost({ tournaments: {} })).toBe(0);
    expect(boost({ network: { schoolCount: 1 } })).toBe(0);
    expect(boost({ collaborators: Array.from({ length: 8 }, (_, i) => ({ contactId: `k${i}` })) })).toBe(0);
    expect(boost({ collaborators: Array.from({ length: 7 }, (_, i) => ({ contactId: `k${i}` })) })).toBe(0);
  });
});
