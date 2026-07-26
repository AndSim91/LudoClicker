import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import {
  LIGHT_INFLATION_CAUSES,
  LIGHT_INFLATION_EVENT_VISIBILITY_MS,
} from "../lightInflation";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";

describe("light inflation visibility save migration", () => {
  it("extends a v63 event from 20 to 60 seconds without losing its cause", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 63;
    legacy.lightInflation.event = {
      cause: LIGHT_INFLATION_CAUSES[0],
      occurredAt: 10_000,
      visibleUntil: 30_000,
    };

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.lightInflation.event).toEqual({
      cause: LIGHT_INFLATION_CAUSES[0],
      occurredAt: 10_000,
      visibleUntil: 10_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
    });
    expect(isValidGameState(migrated)).toBe(true);
  });

  it("keeps a v63 save without an active event compatible", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 63;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.lightInflation.event).toBeUndefined();
    expect(isValidGameState(migrated)).toBe(true);
  });
});
