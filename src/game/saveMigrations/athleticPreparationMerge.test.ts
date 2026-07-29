import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import type { GameState } from "../types";

function legacySave(preparationLevel: number, rancoreLevel: number): GameState {
  const current = createInitialState(1_000);
  return {
    ...current,
    version: 73,
    upgrades: {
      ...current.upgrades,
      "athletic-preparation": preparationLevel,
      "agonist-course-intensity": rancoreLevel,
    },
  };
}

describe("Nessun Rancore save migration", () => {
  it("keeps the highest progress from the two merged upgrades", () => {
    const fromPreparation = migrate(legacySave(4, 2)) as GameState;
    const fromRancore = migrate(legacySave(1, 4)) as GameState;

    expect(fromPreparation.version).toBe(GAME_CONFIG.version);
    expect(fromPreparation.upgrades["agonist-course-intensity"]).toBe(4);
    expect(fromPreparation.upgrades["athletic-preparation"]).toBe(0);
    expect(fromRancore.upgrades["agonist-course-intensity"]).toBe(5);
    expect(fromRancore.upgrades["athletic-preparation"]).toBe(0);
  });

  it("leaves the sixth merged level available as new progression", () => {
    const migrated = migrate(legacySave(5, 4)) as GameState;

    expect(migrated.upgrades["agonist-course-intensity"]).toBe(5);
  });
});
