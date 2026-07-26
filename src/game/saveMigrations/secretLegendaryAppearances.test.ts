import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";
import type { TournamentResult } from "../types";

function ordinaryVictoryResult(
  ownedWinner: boolean,
  level: TournamentResult["level"] = "academy",
): TournamentResult {
  const winner = {
    id: "winner",
    ownedContactId: ownedWinner ? "owned-contact" : undefined,
    firstName: "Ada",
    lastName: "Arena",
    schoolName: ownedWinner ? "Scuola del giocatore" : "Altra scuola",
    city: "Genova",
    rarity: "rare" as const,
    numericForms: 1,
    experience: 1,
    arenaBase: 100,
    styleBase: 100,
    arenaPreparation: 100,
    stylePreparation: 100,
    condition: 1,
  };
  return {
    id: "legacy-result",
    level,
    season: 1,
    completedAt: 1_000,
    participants: [winner],
    matches: [],
    groupStandings: [],
    arenaRanking: [winner.id],
    styleRanking: [winner.id],
    arenaPodium: [],
    stylePodium: [],
    qualifiers: [],
    rewards: [],
    secretLegendaryDefeatedIds: [],
  };
}

describe("secret Legendary appearance save migration", () => {
  it("recovers an ordinary tournament victory from retained results", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 61;
    delete legacy.tournaments.ordinaryVictoryAchieved;
    legacy.tournaments.results = [ordinaryVictoryResult(true)];

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.tournaments.ordinaryVictoryAchieved).toBe(true);
    expect(isValidGameState(migrated)).toBe(true);
  });

  it("does not treat school or Chronicles victories as ordinary victories", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 61;
    delete legacy.tournaments.ordinaryVictoryAchieved;
    legacy.tournaments.results = [
      ordinaryVictoryResult(true, "school"),
      ordinaryVictoryResult(true, "chronicles"),
    ];

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.tournaments.ordinaryVictoryAchieved).toBe(false);
    expect(isValidGameState(migrated)).toBe(true);
  });
});
