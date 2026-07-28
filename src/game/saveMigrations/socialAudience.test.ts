import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";

describe("Social audience save migration", () => {
  it("preserves Social investments and clamps legacy sponsorships to the new maximum", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 60;
    legacy.upgrades["social-content-synthesis"] = 4;
    legacy.upgrades["social-editorial-plan"] = 5;
    legacy.upgrades["social-content-distribution"] = 3;
    legacy.upgrades["social-sponsorships"] = 5;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades).toMatchObject({
      "social-content-synthesis": 4,
      "social-editorial-plan": 0,
      "social-content-distribution": 3,
      "social-sponsorships": 0,
      "winning-advertising": 5,
      "marketing-course": 4,
    });
    expect(isValidGameState(migrated)).toBe(true);
  });
});
