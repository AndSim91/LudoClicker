import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";

describe("collaborator management save migration", () => {
  it("creates aggregate targets and preserves existing assignments", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 52;
    delete legacy.collaboratorManagement;
    legacy.collaborators = Array.from({ length: 9 }, (_, index) => ({
      id: `collaborator-${index}`,
      contactId: legacy.contacts[0].id,
      displayName: `Collaboratore ${index}`,
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      formBranchPreferences: [],
      assignment: index === 0 ? "events" : null,
      mastery: createInitialCollaboratorMastery(),
      rarity: "ultra-rare",
    }));

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.collaboratorManagement.aggregateViewUnlocked).toBe(true);
    expect(migrated.collaboratorManagement.targets).toEqual({
      writing: 0,
      events: 1,
      equipment: 0,
      instructor: 0,
      gadget: 0,
    });
    expect(migrated.collaborators[0].assignment).toBe("events");
    expect(isValidGameState(migrated)).toBe(true);
  });

  it("removes legacy preset data while preserving current sector targets", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 56;
    legacy.collaboratorManagement = {
      ...legacy.collaboratorManagement,
      activePresetId: "preset-1",
      hasUnsavedChanges: true,
      presets: {
        "preset-1": {
          saved: true,
          targets: { writing: 9, events: 0, equipment: 0, instructor: 0 },
        },
      },
      targets: { writing: 2, events: 1, equipment: 0, instructor: 1 },
    };

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.collaboratorManagement.targets).toEqual({
      writing: 2,
      events: 1,
      equipment: 0,
      instructor: 1,
      gadget: 0,
    });
    expect(migrated.collaboratorManagement).not.toHaveProperty("activePresetId");
    expect(migrated.collaboratorManagement).not.toHaveProperty("hasUnsavedChanges");
    expect(migrated.collaboratorManagement).not.toHaveProperty("presets");
    expect(isValidGameState(migrated)).toBe(true);
  });
});
