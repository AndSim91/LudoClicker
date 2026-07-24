import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";
import { GAME_CONFIG } from "../config";

describe("teacher training save migration", () => {
  it("adds Technician progress and classifies active legacy courses", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 55;
    legacy.contacts[0].training = {
      formId: "form-1",
      startedAt: 1_000,
      completesAt: 20_000,
      status: "running",
    };
    legacy.collaborators = [{
      id: "legacy-instructor",
      contactId: legacy.contacts[1].id,
      displayName: "Legacy Instructor",
      joinedAt: 1_000,
      forms: ["form-1"],
      instructorForms: [],
      formBranchPreferences: [],
      assignment: "instructor",
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare",
      training: {
        formId: "course-x",
        startedAt: 1_000,
        completesAt: 30_000,
        status: "running",
        includesInstructorCertification: true,
        instructorTrainingDurationMultiplier: 1,
      },
    }];
    legacy.legendaryCollaborators.retainedProgress["eva-parodi"] = {
      forms: ["form-1"],
      instructorForms: ["form-1"],
      joinedAt: 1_000,
    };

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.contacts[0].training).toMatchObject({
      trainingTrack: "athlete",
      trainingPhase: "athlete",
    });
    expect(migrated.collaborators[0].technicianForms).toEqual([]);
    expect(migrated.collaborators[0].training).toMatchObject({
      trainingTrack: "combined-instructor",
      trainingPhase: "athlete",
    });
    expect(
      migrated.legendaryCollaborators.retainedProgress["eva-parodi"]?.technicianForms,
    ).toEqual([]);
    expect(isValidGameState(migrated)).toBe(true);
  });
});
