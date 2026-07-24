import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";
import { GAME_CONFIG } from "../config";

describe("collaborator operations save migration", () => {
  it("absorbs legacy athletic trainers and preserves the strongest mastery", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 54;
    delete legacy.upgrades["athletic-preparation"];
    delete legacy.collaboratorManagement.targets;
    delete legacy.collaboratorManagement.hasUnsavedChanges;
    legacy.collaborators = [
      {
        id: "trainer",
        contactId: legacy.contacts[0].id,
        displayName: "Preparatore",
        joinedAt: 1_000,
        forms: ["form-3-staff"],
        instructorForms: ["form-3-staff"],
        formBranchPreferences: ["Staffa"],
        autoTeachingEnabled: false,
        assignment: "lessons",
        mastery: {
          writing: 0,
          events: 0,
          lessons: 700,
          equipment: 0,
          instructor: 300,
        },
        rarity: "ultra-rare",
      },
    ];
    legacy.collaboratorManagement.aggregateViewUnlocked = true;
    legacy.collaboratorManagement.presets["preset-1"] = {
      saved: true,
      targets: {
        writing: 0,
        events: 0,
        lessons: 2,
        equipment: 0,
        instructor: 1,
      },
    };
    legacy.collaboratorManagement.activePresetId = "preset-1";
    legacy.legendaryCollaborators.retainedProgress["eva-parodi"] = {
      forms: [],
      instructorForms: [],
      joinedAt: 1_000,
      mastery: {
        writing: 0,
        events: 0,
        lessons: 1_500,
        equipment: 0,
        instructor: 700,
      },
    };

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.collaborators[0].assignment).toBe("instructor");
    expect(migrated.collaborators[0].mastery?.instructor).toBe(700);
    expect(migrated.collaborators[0]).not.toHaveProperty("autoTeachingEnabled");
    expect(migrated.collaborators[0].mastery).not.toHaveProperty("lessons");
    expect(migrated.collaboratorManagement.targets.instructor).toBe(3);
    expect(
      migrated.collaboratorManagement.presets["preset-1"].targets.instructor,
    ).toBe(3);
    expect(
      migrated.legendaryCollaborators.retainedProgress["eva-parodi"]?.mastery
        ?.instructor,
    ).toBe(1_500);
    expect(migrated.upgrades["athletic-preparation"]).toBe(0);
    expect(isValidGameState(migrated)).toBe(true);
  });
});
