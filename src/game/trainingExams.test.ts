import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import { gameReducer } from "./engine";
import type { Collaborator, FormId, FormTraining } from "./types";

function qualifiedCollaborator(
  initial: ReturnType<typeof createInitialState>,
  training: FormTraining,
): Collaborator {
  return {
    id: "exam-collaborator",
    contactId: "exam-contact",
    displayName: "Collaboratore Esami",
    joinedAt: 1_000,
    forms: ["form-1"],
    instructorForms: [],
    technicianForms: [],
    formBranchPreferences: [],
    assignment: "instructor",
    mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
    rarity: initial.collaborators[0]?.rarity ?? "ultra-rare",
    training,
  };
}

describe("esami di formazione nascosti", () => {
  it("extends only the failed athlete phase by 10% without exposing the failure", () => {
    const initial = createInitialState(1_000, "", false);
    const athlete = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: [] as FormId[],
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 2_000,
        status: "running" as const,
        equipmentUsed: 0,
        wearPerSword: 0,
        trainingTrack: "athlete" as const,
        trainingPhase: "athlete" as const,
        trainingBaseDurationMs: 20_000,
        trainingDurationMultiplier: 1,
      },
    };
    const ready = {
      ...initial,
      contacts: [athlete],
      collaborators: [],
      randomSeed: 6,
    };

    const failed = gameReducer(ready, { type: "TICK", now: 2_000 });

    expect(failed.contacts[0].forms).toEqual([]);
    expect(failed.contacts[0].training?.completesAt).toBe(4_000);
    expect(failed.contacts[0].training?.examFailures).toBe(1);
    expect(failed.messages).toEqual(ready.messages);

    const passed = gameReducer(
      { ...failed, randomSeed: 1 },
      { type: "TICK", now: 4_000 },
    );
    expect(passed.contacts[0].forms).toEqual(["form-1"]);
    expect(passed.contacts[0].training).toBeUndefined();
  });

  it("uses distinct 50% and 45% thresholds for Instructor and Technician exams", () => {
    const initial = createInitialState(1_000, "", false);
    const instructorTraining: FormTraining = {
      formId: "form-1",
      startedAt: 1_000,
      completesAt: 2_000,
      status: "running",
      trainingTrack: "instructor",
      trainingPhase: "instructor",
      trainingBaseDurationMs: 10_000,
      trainingDurationMultiplier: 1,
    };
    const instructorFailure = gameReducer({
      ...initial,
      contacts: [],
      collaborators: [qualifiedCollaborator(initial, instructorTraining)],
      randomSeed: 58,
    }, { type: "TICK", now: 2_000 });
    expect(instructorFailure.collaborators[0].instructorForms).toEqual([]);
    expect(instructorFailure.collaborators[0].training?.completesAt).toBe(3_000);

    const technicianTraining: FormTraining = {
      ...instructorTraining,
      trainingTrack: "technician",
      trainingPhase: "technician",
      trainingBaseDurationMs: 100_000,
    };
    const technicianPass = gameReducer({
      ...initial,
      contacts: [],
      collaborators: [qualifiedCollaborator(initial, technicianTraining)],
      randomSeed: 58,
    }, { type: "TICK", now: 2_000 });
    expect(technicianPass.collaborators[0].technicianForms).toEqual(["form-1"]);

    const technicianFailure = gameReducer({
      ...initial,
      contacts: [],
      collaborators: [qualifiedCollaborator(initial, technicianTraining)],
      randomSeed: 14,
    }, { type: "TICK", now: 2_000 });
    expect(technicianFailure.collaborators[0].technicianForms).toEqual([]);
    expect(technicianFailure.collaborators[0].training?.completesAt).toBe(12_000);
  });

  it("runs the combined Instructor path as two independent phases and one annual slot", () => {
    const initial = createInitialState(1_000, "", false);
    const collaborator: Collaborator = {
      id: "combined-instructor",
      contactId: "combined-contact",
      displayName: "Istruttore Combinato",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      technicianForms: [],
      formBranchPreferences: [],
      assignment: "instructor",
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "legendary",
    };
    const ready = {
      ...initial,
      school: { ...initial.school, currentMonth: 9, euros: 500 },
      contacts: [],
      collaborators: [collaborator],
      unlocks: { ...initial.unlocks, forms: true },
    };

    const started = gameReducer(ready, {
      type: "START_FORM_TRAINING",
      personId: collaborator.id,
      formId: "form-1",
      now: 2_000,
    });
    expect(started.school.euros).toBe(325);
    expect(started.collaborators[0].formTrainingYearCount).toBe(1);
    expect(started.collaborators[0].training?.trainingPhase).toBe("athlete");

    const athletePassed = gameReducer(
      { ...started, randomSeed: 1 },
      { type: "TICK", now: started.collaborators[0].training!.completesAt },
    );
    expect(athletePassed.collaborators[0].forms).toEqual(["form-1"]);
    expect(athletePassed.collaborators[0].instructorForms).toEqual([]);
    expect(athletePassed.collaborators[0].training?.trainingPhase).toBe("instructor");
    expect(athletePassed.collaborators[0].formTrainingYearCount).toBe(1);

    const instructorPassed = gameReducer(
      { ...athletePassed, randomSeed: 1 },
      { type: "TICK", now: athletePassed.collaborators[0].training!.completesAt },
    );
    expect(instructorPassed.collaborators[0].forms).toEqual(["form-1"]);
    expect(instructorPassed.collaborators[0].instructorForms).toEqual(["form-1"]);
    expect(instructorPassed.collaborators[0].training).toBeUndefined();
    expect(instructorPassed.collaborators[0].formTrainingYearCount).toBe(1);
  });
});
