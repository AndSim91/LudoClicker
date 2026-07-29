import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import type { GameState } from "../types";

function version74Save(rancoreLevel: number): GameState {
  const current = createInitialState(1_000);
  return {
    ...current,
    version: 74,
    upgrades: {
      ...current.upgrades,
      "agonist-course-intensity": rancoreLevel,
    },
  };
}

describe("Nessun Rancore progression migration", () => {
  it.each([
    [0, 0],
    [1, 5],
    [2, 6],
    [3, 7],
    [4, 8],
    [5, 9],
    [6, 10],
  ])("maps legacy level %i to level %i", (legacyLevel, expectedLevel) => {
    const migrated = migrate(version74Save(legacyLevel)) as GameState;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades["agonist-course-intensity"]).toBe(expectedLevel);
  });
});
