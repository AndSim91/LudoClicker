import { describe, expect, it } from "vitest";
import {
  SECRET_LEGENDARIES,
  getChroniclesLegendaryIds,
  getSecretLegendaryIdsForTournament,
  type SecretLegendaryId,
} from "./secretLegendaries";
import {
  TOURNAMENT_SCHOOLS,
  getNpcSchoolPool,
  getTournamentSchool,
} from "./tournamentSchools";

describe("tournament school catalogue", () => {
  it("uses unique stable ids and one record per Alpha order", () => {
    const ids = TOURNAMENT_SCHOOLS.map((school) => school.id);
    const alphaOrders = getNpcSchoolPool("academy");

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(alphaOrders.map((school) => school.name)).size).toBe(alphaOrders.length);
    expect(getTournamentSchool("alpha-ordine-della-cripta")).toMatchObject({
      name: "Ordine della Cripta",
      city: "Milano e Monza",
    });
  });

  it("keeps Academy, National and Champion's pools disjoint", () => {
    const levels = ["academy", "national", "champions"] as const;
    const pools = levels.map((level) => getNpcSchoolPool(level));

    expect(pools.map((pool) => pool.length)).toEqual([11, 7, 11]);
    levels.forEach((level, index) => {
      expect(pools[index].length).toBeGreaterThan(0);
      expect(pools[index].every((school) => school.level === level)).toBe(true);
    });
    expect(new Set(pools.flat().map((school) => school.id)).size).toBe(
      pools.reduce((total, pool) => total + pool.length, 0),
    );
    expect(getNpcSchoolPool("national").every((school) =>
      school.kind === "academy" && school.nation === "Italia"
    )).toBe(true);
    expect(getNpcSchoolPool("champions").every((school) => {
      const nation: string = school.nation;
      return school.kind === "nation" && nation !== "Italia";
    })).toBe(true);
  });
});

describe("secret legendary catalogue", () => {
  it("places every profile in its tournament (07/10)", () => {
    expect(getSecretLegendaryIdsForTournament("academy")).toEqual([
      "marco-palena",
      "lorenzo-todaro",
      "elisa-brondolo",
      "ruggero-pini",
      "adriano-panico",
    ]);
    expect(getSecretLegendaryIdsForTournament("national")).toEqual([
      "pietro-scarica",
      "piero-dipalo",
      "sara-magnifico",
      "daniele-panizza",
      "marco-brondolo",
      "daniele-maggi",
    ]);
    expect(getSecretLegendaryIdsForTournament("champions")).toEqual([
      "enrico-giovanetti",
      "francesco-d-addosio",
      "jacopo-viola",
      "pierluigi-chimienti",
      "marcello-lovo",
      "simone-pedrazzi",
    ]);
    // The Chronicles challenge goes to the weakest one still free: this order.
    const strength = (id: SecretLegendaryId) => SECRET_LEGENDARIES[id].tournament[0] + SECRET_LEGENDARIES[id].tournament[1];
    expect([...getChroniclesLegendaryIds()].sort((a, b) => strength(a) - strength(b))).toEqual([
      "debora-girelli",
      "andrea-pini",
      "antonio-rocchitelli",
      "ugo-cesare-tonelli",
      "paolo-scalzulli",
      "carlos-jimenez-moyano",
      "lorenzo-ferrario",
    ]);
  });
});
