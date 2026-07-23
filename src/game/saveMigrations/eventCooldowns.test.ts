import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";

describe("event cooldown save migration", () => {
  it("preserves an active legacy sparring cooldown", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 53;
    legacy.lastSavedAt = 2_000;
    legacy.activities = { nextSparringAt: 6_000 };

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.activities.eventCooldowns["park-sparring"]).toEqual({
      kind: "realtime",
      startedAt: 2_000,
      availableAt: 6_000,
    });
    expect(isValidGameState(migrated)).toBe(true);
  });

  it("drops an expired legacy sparring cooldown", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 53;
    legacy.lastSavedAt = 6_000;
    legacy.activities = { nextSparringAt: 6_000 };

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.activities.eventCooldowns).toEqual({});
    expect(isValidGameState(migrated)).toBe(true);
  });
});
