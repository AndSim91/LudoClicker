import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";
import type { GameState, InboxMessage, TournamentResult } from "../types";

function result(
  id: string,
  level: TournamentResult["level"],
  season: number,
  arenaOwned: boolean,
  styleOwned: boolean,
): TournamentResult {
  return {
    id,
    level,
    season,
    completedAt: season * 10_000,
    participants: [
      {
        id: `${id}-arena`,
        ownedContactId: arenaOwned ? "owned-arena" : undefined,
        firstName: "Ada",
        lastName: "Arena",
        schoolName: "Ordine delle Onde",
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
        ownedContactId: styleOwned ? "owned-style" : undefined,
        firstName: "Sofia",
        lastName: "Stile",
        schoolName: "Ordine delle Onde",
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
    arenaRanking: [`${id}-arena`, `${id}-style`],
    styleRanking: [`${id}-style`, `${id}-arena`],
    arenaPodium: [],
    stylePodium: [],
    qualifiers: [],
    rewards: [],
    secretLegendaryDefeatedIds: [],
  };
}

describe("lean history migration", () => {
  it("removes Social notifications and retains only compact tournament history", () => {
    const initial = createInitialState(1_000, "Manager");
    const socialMessage: InboxMessage = {
      id: "social-message",
      sender: "Ordine delle Onde",
      subject: "Contenuti Social pubblicati",
      preview: "Un contenuto pubblicato.",
      receivedAt: 1_000,
      tone: "positive",
      unread: true,
      category: "other",
    };
    const results = [
      result("old-school", "school", 1, true, false),
      result("old-academy", "academy", 1, false, true),
      result("current-school", "school", 2, false, false),
      result("current-school-replay", "school", 2, true, true),
      result("current-academy", "academy", 2, false, true),
      result("old-chronicles", "chronicles", 2, true, false),
      result("current-chronicles", "chronicles", 3, false, true),
    ];
    const legacy = {
      ...initial,
      version: 79,
      messages: [socialMessage, ...initial.messages],
      tournaments: { ...initial.tournaments, results },
    };

    const migrated = migrate(legacy) as GameState;

    expect(migrated).toMatchObject({ version: 80 });
    expect(isValidGameState(migrated)).toBe(true);
    expect(migrated.tournaments.results.map((entry) => entry.id)).toEqual([
      "current-school-replay",
      "current-academy",
      "current-chronicles",
    ]);
    expect(migrated.tournaments.hall).toEqual([
      { level: "school", season: 1, arenaWinner: "Ada Arena" },
      { level: "academy", season: 1, styleWinner: "Sofia Stile" },
      {
        level: "school",
        season: 2,
        arenaWinner: "Ada Arena",
        styleWinner: "Sofia Stile",
      },
      { level: "academy", season: 2, styleWinner: "Sofia Stile" },
      { level: "chronicles", season: 2, arenaWinner: "Ada Arena" },
      { level: "chronicles", season: 3, styleWinner: "Sofia Stile" },
    ]);
    expect(migrated.messages.some((message) => message.id === socialMessage.id)).toBe(false);
    expect(legacy.tournaments.results).toBe(results);
    expect(legacy.messages[0]).toBe(socialMessage);
  });
});
