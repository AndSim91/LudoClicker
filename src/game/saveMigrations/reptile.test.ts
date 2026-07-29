import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import type { GameState } from "../types";

describe("migrazione Torneo Reptile", () => {
  it("aggiunge lo stato Open ai salvataggi v71", () => {
    const legacy = structuredClone(createInitialState(1_000, "Manager")) as GameState & {
      version: number;
      tournaments: Omit<GameState["tournaments"], "reptile"> & {
        reptile?: GameState["tournaments"]["reptile"];
      };
    };
    legacy.version = 71;
    delete (legacy.tournaments as Partial<GameState["tournaments"]>).reptile;

    const migrated = migrate(legacy) as GameState;
    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.tournaments.reptile).toEqual({
      unlocked: false,
      fameXp: 0,
      victories: 0,
      nextPreparationSchoolYear: 1,
      hall: [],
    });
  });
});
