import { describe, expect, it } from "vitest";
import { FIRST_COLLABORATOR_TUTORIAL_SCENE_ID } from "../../content/tutorialScenes";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import type { GameState } from "../types";

describe("first collaborator tutorial save migration", () => {
  it("skips the new scene in existing saves while preserving tutorial history", () => {
    const legacy = structuredClone(createInitialState(1_000, "Manager"));
    legacy.version = 72;
    legacy.tutorial.completedSceneIds = ["first-invitation"];
    legacy.tutorial.skippedSceneIds = ["first-event"];

    const migrated = migrate(legacy) as GameState;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.tutorial.completedSceneIds).toEqual(["first-invitation"]);
    expect(migrated.tutorial.skippedSceneIds).toEqual([
      "first-event",
      FIRST_COLLABORATOR_TUTORIAL_SCENE_ID,
    ]);
  });

  it("leaves the new tutorial pending in a fresh game", () => {
    const fresh = createInitialState(1_000, "Manager");

    expect(fresh.version).toBe(GAME_CONFIG.version);
    expect(fresh.tutorial.completedSceneIds).not.toContain(
      FIRST_COLLABORATOR_TUTORIAL_SCENE_ID,
    );
    expect(fresh.tutorial.skippedSceneIds).not.toContain(
      FIRST_COLLABORATOR_TUTORIAL_SCENE_ID,
    );
  });
});
