import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import type { GameState } from "../types";

describe("automatic email sending save migration", () => {
  it("enables automatic sending for existing saves", () => {
    const current = createInitialState(1_000);
    const legacyAutomation: Partial<GameState["automation"]> = { ...current.automation };
    delete legacyAutomation.autoSendEmails;
    const legacy = {
      ...current,
      version: 48,
      automation: legacyAutomation,
    };

    const migrated = migrate(legacy) as GameState;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.automation.autoSendEmails).toBe(true);
  });
});
