import { describe, expect, it } from "vitest";
import {
  SECRET_LEGENDARIES,
  SECRET_LEGENDARY_IDS,
  getSecretLegendaryIdsForTournament,
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
    expect(getNpcSchoolPool("champions").every((school) =>
      school.kind === "nation" && school.nation !== "Italia"
    )).toBe(true);
  });
});

describe("secret legendary catalogue", () => {
  it("links every profile to an existing school and derives its tournament", () => {
    for (const id of SECRET_LEGENDARY_IDS) {
      const profile = SECRET_LEGENDARIES[id];
      if (profile.schoolId) expect(getTournamentSchool(profile.schoolId)).toBeDefined();
    }

    expect(getSecretLegendaryIdsForTournament("academy")).toEqual([
      "marco-palena",
      "lorenzo-todaro",
      "daniele-panizza",
      "sara-magnifico",
      "daniele-maggi",
    ]);
    expect(getSecretLegendaryIdsForTournament("national")).toEqual([
      "pietro-scarica",
      "piero-dipalo",
      "simone-pedrazzi",
    ]);
    expect(getSecretLegendaryIdsForTournament("champions")).toEqual([]);
    expect(SECRET_LEGENDARIES["francesco-d-addosio"].schoolId).toBeUndefined();
    expect(SECRET_LEGENDARIES["paolo-scalzulli"].schoolId).toBeUndefined();
    expect(SECRET_LEGENDARIES["lorenzo-ferrario"].schoolId).toBeUndefined();
    expect(SECRET_LEGENDARIES["antonio-rocchitelli"].schoolId).toBeUndefined();
    expect(SECRET_LEGENDARIES["ugo-cesare-tonelli"].schoolId).toBeUndefined();
    expect(SECRET_LEGENDARIES["enrico-giovanetti"].schoolId).toBeUndefined();
    expect(SECRET_LEGENDARIES["carlos-jimenez-moyano"].schoolId).toBeUndefined();
  });
});
