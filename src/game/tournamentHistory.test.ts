import { describe, expect, it } from "vitest";
import {
  compactDetailedTournamentResults,
  replaceTournamentHallEntry,
} from "./tournamentHistory";
import type { TournamentResult } from "./types";

function result(
  id: string,
  level: TournamentResult["level"],
  season: number,
  ownedArena = false,
  ownedStyle = false,
): TournamentResult {
  return {
    id,
    level,
    season,
    completedAt: Number(id.replaceAll(/\D/g, "")) || 1,
    participants: [
      {
        id: `${id}-arena`,
        ownedContactId: ownedArena ? "owned-arena" : undefined,
        firstName: "Ada",
        lastName: "Arena",
        schoolName: "Onde",
        city: "Genova",
        rarity: "rare",
        numericForms: 1,
        experience: 0,
        arenaBase: 1,
        styleBase: 1,
        arenaPreparation: 1,
        stylePreparation: 1,
        condition: 1,
      },
      {
        id: `${id}-style`,
        ownedContactId: ownedStyle ? "owned-style" : undefined,
        firstName: "Sofia",
        lastName: "Stile",
        schoolName: "Onde",
        city: "Genova",
        rarity: "rare",
        numericForms: 1,
        experience: 0,
        arenaBase: 1,
        styleBase: 1,
        arenaPreparation: 1,
        stylePreparation: 1,
        condition: 1,
      },
    ],
    matches: [],
    groupStandings: [],
    arenaRanking: [`${id}-arena`],
    styleRanking: [`${id}-style`],
    arenaPodium: [],
    stylePodium: [],
    qualifiers: [],
    rewards: [],
    secretLegendaryDefeatedIds: [],
  };
}

describe("tournament history", () => {
  it("retains one result per level in the latest ordinary season and the latest Chronicles", () => {
    const results = [
      result("school-1", "school", 1),
      result("academy-1", "academy", 1),
      result("school-2-old", "school", 2),
      result("school-2-new", "school", 2),
      result("academy-2", "academy", 2),
      result("chronicles-2", "chronicles", 2),
      result("chronicles-3", "chronicles", 3),
    ];

    expect(compactDetailedTournamentResults(results).map((entry) => entry.id)).toEqual([
      "school-2-new",
      "academy-2",
      "chronicles-3",
    ]);
  });

  it("stores only school first-place names and overwrites the same edition", () => {
    const won = result("academy-1", "academy", 1, true, false);
    const hall = replaceTournamentHallEntry([], won);
    expect(hall).toEqual([{
      level: "academy",
      season: 1,
      arenaWinner: "Ada Arena",
    }]);

    const lostReplay = result("academy-1-replay", "academy", 1, false, false);
    expect(replaceTournamentHallEntry(hall, lostReplay)).toEqual([]);
  });
});
