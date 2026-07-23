import { describe, expect, it } from "vitest";
import { TUTORIAL_SCENE_IDS } from "../../content/tutorialScenes";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";

describe("tutorial save migration", () => {
  it("does not replay introductory scenes but leaves the new Social tutorial pending", () => {
    const current = createInitialState(1_000, "Andrea Ungaro");
    const legacy = { ...current, version: 46 } as Partial<typeof current>;
    delete legacy.tutorial;

    const migrated = migrate(legacy) as typeof current;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.tutorial).toEqual({
      completedSceneIds: TUTORIAL_SCENE_IDS.filter(
        (sceneId) => sceneId !== "social-evolution",
      ),
      skippedSceneIds: [],
    });
  });
});
