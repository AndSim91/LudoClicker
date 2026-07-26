import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";

describe("Project X save migration", () => {
  it("locks Project X while preserving existing Course X progress", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 59;
    delete legacy.upgrades["project-x"];
    legacy.contacts[0].forms = ["form-1", "course-x", "form-2"];
    legacy.legendaryCollaborators.retainedProgress["eva-parodi"] = {
      forms: ["form-1", "course-x", "form-2"],
      instructorForms: ["course-x"],
      technicianForms: ["course-x"],
      joinedAt: 1_000,
    };

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades["project-x"]).toBe(0);
    expect(migrated.contacts[0].forms).toEqual(["form-1", "course-x", "form-2"]);
    expect(migrated.legendaryCollaborators.retainedProgress["eva-parodi"])
      .toMatchObject({
        forms: ["form-1", "course-x", "form-2"],
        instructorForms: ["course-x"],
        technicianForms: ["course-x"],
      });
    expect(isValidGameState(migrated)).toBe(true);
  });
});
