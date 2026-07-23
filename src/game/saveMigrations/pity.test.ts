import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";

describe("Pity save migration", () => {
  it("initializes Pity at zero in version 51 saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 51;
    delete legacy.legendaryPity;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.legendaryPity).toBe(0);
    expect(isValidGameState(migrated)).toBe(true);
  });
});
