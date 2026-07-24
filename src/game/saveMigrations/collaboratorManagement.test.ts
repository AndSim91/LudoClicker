import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";

describe("collaborator management save migration", () => {
  it("creates empty presets and preserves existing assignments", () => {
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
    expect(migrated.collaboratorManagement.activePresetId).toBeNull();
    expect(migrated.collaboratorManagement.hasUnsavedChanges).toBe(false);
    expect(migrated.collaboratorManagement.targets).toEqual({
      writing: 0,
      events: 1,
      equipment: 0,
      instructor: 0,
    });
    expect(Object.values(migrated.collaboratorManagement.presets)).toEqual([
      { saved: false, targets: { writing: 0, events: 0, equipment: 0, instructor: 0 } },
      { saved: false, targets: { writing: 0, events: 0, equipment: 0, instructor: 0 } },
      { saved: false, targets: { writing: 0, events: 0, equipment: 0, instructor: 0 } },
    ]);
    expect(migrated.collaborators[0].assignment).toBe("events");
    expect(isValidGameState(migrated)).toBe(true);
  });
});
