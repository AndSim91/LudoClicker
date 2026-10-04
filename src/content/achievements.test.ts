import { GAME_CONFIG } from "../game/config";
import { describe, expect, it } from "vitest";
import { addAdminMembers } from "../game/adminFlow";
import { getCareer } from "../game/career";
import { createInitialState, gameReducer } from "../game/engine";
import { migrate } from "../game/saveMigrations";
import { foundSchool } from "../game/schoolProgressionFlow";
import type { GameState } from "../game/types";
import {
  ACHIEVEMENT_TOTAL,
  ALL_ACHIEVEMENT_KEYS,
  SECRET_ACHIEVEMENTS,
  TIERED_ACHIEVEMENTS,
  getNewAchievementKeys,
} from "./achievements";

const details = { name: "Ordine del Faro", city: "Trieste", motto: "", specialization: "redazione" as const };

describe("achievements", () => {
  it("has 30 tiered achievements and 10 secrets with unique ids", () => {
    expect(TIERED_ACHIEVEMENTS).toHaveLength(30);
    expect(SECRET_ACHIEVEMENTS).toHaveLength(10);
    expect(ACHIEVEMENT_TOTAL).toBe(100);
    expect(new Set(ALL_ACHIEVEMENT_KEYS).size).toBe(100);
    for (const definition of TIERED_ACHIEVEMENTS) {
      const [bronze, silver, gold] = definition.thresholds;
      expect(bronze < silver && silver < gold).toBe(true);
    }
  });

  it("unlocks every tier reached at once, then nothing again", () => {
    const initial = createInitialState(1_000);
    const state: GameState = { ...initial, statistics: { ...initial.statistics, emailsSent: 1_500 } };
    const keys = getNewAchievementKeys(state);
    expect(keys).toEqual(expect.arrayContaining(["emails:bronze", "emails:silver"]));
    expect(keys).not.toContain("emails:gold");

    const earned = gameReducer(state, { type: "TICK", now: 2_000 });
    expect(earned.achievements).toEqual(expect.arrayContaining(["emails:bronze", "emails:silver"]));
    expect(getNewAchievementKeys(earned)).toEqual([]);
  });

  it("keeps secrets locked until their condition holds", () => {
    const initial = createInitialState(1_000);
    expect(getNewAchievementKeys(initial)).not.toContain("abandoned-armory");
    const broken = { ...initial, equipment: { ...initial.equipment, totalSwords: 2_000, damagedSwords: 1_000 } };
    expect(getNewAchievementKeys(broken)).toContain("abandoned-armory");
  });

  it("carries the career counters across the prestige", () => {
    const base = addAdminMembers(createInitialState(1_000), 125);
    const ready: GameState = {
      ...base,
      school: { ...base.school, fame: 5_000 },
      player: { ...base.player, perfectPhrases: 7 },
      tournaments: { ...base.tournaments, nationalTitlesCurrentSchool: 1 },
    };
    const founded = foundSchool(ready, details, 2_000, { upgrades: {}, rent: 6 });
    expect(getCareer(founded)).toMatchObject({
      reputationEarned: 8,
      perfectPhrases: 7,
      maxRentPoints: 6,
      earliestFoundationYear: 1,
    });
    expect(founded.player.perfectPhrases).toBeUndefined();
  });

  it("drops the old achievements except the two secrets and rebuilds the counters (v87)", () => {
    const initial = createInitialState(1_000);
    const saved = {
      ...initial,
      version: 86,
      achievements: ["first-email", "persistent-invites", "ten-schools"],
      statistics: { ...initial.statistics, career: undefined },
      tournaments: { ...initial.tournaments, nationalTitlesCurrentSchool: 2, championsVictoryCurrentSchool: true },
    };
    const migrated = migrate(saved) as GameState;
    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.achievements).toEqual(["persistent-invites"]);
    expect(getCareer(migrated)).toMatchObject({ nationalTitles: 2, championsWins: 1 });
  });
});
