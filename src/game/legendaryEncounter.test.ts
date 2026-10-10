import { describe, expect, it } from "vitest";
import { getCouncilBoost, getLegendaryEncounterMultiplier, getPipelineLegendaryCount } from "./contacts";
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

describe("Leggendari in squadra e Reputazione (malus 75% dal 10/10)", () => {
  it("toglie il 75% per ogni Leggendario oltre il primo", () => {
    expect(getLegendaryEncounterMultiplier(state(0, 0))).toBe(1);
    expect(getLegendaryEncounterMultiplier(state(1, 0))).toBe(1);
    expect(getLegendaryEncounterMultiplier(state(2, 0))).toBeCloseTo(0.25);
    expect(getLegendaryEncounterMultiplier(state(8, 0))).toBeCloseTo(0.25 ** 7);
    // Nei contatti conta anche chi è in coda o in prova.
    expect(getLegendaryEncounterMultiplier(state(1, 0), 3)).toBeCloseTo(0.25 ** 2);
  });

  it("la Reputazione annulla il malus a 25 punti e raddoppia la base a 50", () => {
    expect(getLegendaryEncounterMultiplier(state(8, 10))).toBeCloseTo(0.25 ** (7 * 0.6));
    expect(getLegendaryEncounterMultiplier(state(8, 25))).toBe(1);
    expect(getLegendaryEncounterMultiplier(state(8, 35))).toBeCloseTo(1.4);
    expect(getLegendaryEncounterMultiplier(state(8, 50))).toBe(2);
    expect(getLegendaryEncounterMultiplier(state(8, 400))).toBe(2);
  });
});

describe("Leggendari che contano per il malus nei contatti", () => {
  it("iscritti, in coda e in prova; non chi ha fallito la prova", () => {
    const contacts = [
      { specialProfileId: "a", status: "enrolled" },
      { specialProfileId: "b", status: "available" },
      { specialProfileId: "c", status: "trialScheduled" },
      { specialProfileId: "d", status: "lost" },
      { specialProfileId: "e", status: "departed" },
      { status: "available" },
    ];
    expect(getPipelineLegendaryCount({ contacts } as unknown as Parameters<typeof getPipelineLegendaryCount>[0])).toBe(3);
  });
});

describe("Spinta verso il Consiglio (10/10)", () => {
  const base = {
    network: { schoolCount: 0 },
    tournaments: { firstSchoolTournamentMonth: 10 },
    school: { currentMonth: 19 },
    collaborators: [{ contactId: "c1" }],
    contacts: [
      { id: "c1", rarity: "legendary", status: "enrolled" },
      { id: "u0", rarity: "ultra-rare", status: "available" },
      { id: "u1", rarity: "ultra-rare", status: "trialScheduled" },
      { id: "ux", rarity: "ultra-rare", status: "lost" },
      { id: "r0", rarity: "rare", status: "enrolled" },
    ],
  };
  const boost = (patch: object = {}, extra = 0) =>
    getCouncilBoost({ ...base, ...patch } as unknown as Parameters<typeof getCouncilBoost>[0], extra);

  it("+5% ogni mese dal primo Scolastico, −12,5% del totale per Ultra Raro o Leggendario in arrivo o iscritto", () => {
    // 9 mesi = 45%; 3 potenziali (1 Leggendario iscritto, 1 Ultra Raro in coda, 1 in prova).
    expect(boost()).toBeCloseTo(0.45 * 0.625);
    expect(boost({}, 2)).toBeCloseTo(0.45 * 0.375);
    expect(boost({ school: { currentMonth: 10 } })).toBe(0);
  });

  it("a 8 potenziali è zero ma continua a crescere: torna se qualcuno si perde", () => {
    expect(boost({}, 5)).toBe(0);
    expect(boost({ school: { currentMonth: 50 } }, 4)).toBeCloseTo(2 * 0.125);
  });

  it("niente bonus prima dello Scolastico, dopo la prima scuola o con 8 collaboratori", () => {
    expect(boost({ tournaments: {} })).toBe(0);
    expect(boost({ network: { schoolCount: 1 } })).toBe(0);
    expect(boost({ collaborators: Array.from({ length: 8 }, (_, i) => ({ contactId: `k${i}` })) })).toBe(0);
  });
});
