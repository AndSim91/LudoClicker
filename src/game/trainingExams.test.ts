import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import { gameReducer } from "./engine";
import { nextRandom } from "./random";
import { getExamProfile } from "./trainingResolution";
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

  it("applies each Master of none exam bonus to athletes, Instructors and Technicians", () => {
    const initial = createInitialState(1_000, "", false);
    const athleteTraining: FormTraining = {
      formId: "form-1",
      startedAt: 1_000,
      completesAt: 2_000,
      status: "running",
      trainingTrack: "athlete",
      trainingPhase: "athlete",
      trainingBaseDurationMs: 20_000,
      trainingDurationMultiplier: 1,
    };
    const athlete = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: [] as FormId[],
      training: athleteTraining,
    };
    const resolveAthlete = (level: number, randomSeed: number) => gameReducer({
      ...initial,
      contacts: [athlete],
      collaborators: [],
      upgrades: { ...initial.upgrades, "instructor-versatility": level },
      randomSeed,
    }, { type: "TICK", now: 2_000 });

    expect(resolveAthlete(0, 58).contacts[0].forms).toEqual([]);
    expect(resolveAthlete(3, 58).contacts[0].forms).toEqual(["form-1"]);
    expect(resolveAthlete(3, 18).contacts[0].forms).toEqual([]);
    expect(resolveAthlete(4, 18).contacts[0].forms).toEqual(["form-1"]);

    const instructorTraining: FormTraining = {
      ...athleteTraining,
      trainingTrack: "instructor",
      trainingPhase: "instructor",
      trainingBaseDurationMs: 10_000,
    };
    const resolveCollaborator = (
      level: number,
      randomSeed: number,
      training: FormTraining,
    ) => gameReducer({
      ...initial,
      contacts: [],
      collaborators: [qualifiedCollaborator(initial, training)],
      upgrades: { ...initial.upgrades, "instructor-versatility": level },
      randomSeed,
    }, { type: "TICK", now: 2_000 });

    expect(resolveCollaborator(0, 14, instructorTraining).collaborators[0].instructorForms)
      .toEqual([]);
    expect(resolveCollaborator(3, 14, instructorTraining).collaborators[0].instructorForms)
      .toEqual(["form-1"]);

    const technicianTraining: FormTraining = {
      ...instructorTraining,
      trainingTrack: "technician",
      trainingPhase: "technician",
      trainingBaseDurationMs: 100_000,
    };
    expect(resolveCollaborator(0, 18, technicianTraining).collaborators[0].technicianForms)
      .toEqual([]);
    expect(resolveCollaborator(3, 18, technicianTraining).collaborators[0].technicianForms)
      .toEqual(["form-1"]);
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

  describe("malus di Istruttori in e-Learning", () => {
    const initial = createInitialState(1_000, "", false);
    const athleteCourse: FormTraining = { formId: "form-1", startedAt: 0, completesAt: 0, trainingPhase: "athlete", trainingTrack: "athlete" };
    const instructorCourse: FormTraining = { ...athleteCourse, trainingPhase: "instructor", trainingTrack: "instructor" };
    const teacher = (extra: Partial<Collaborator>): Collaborator => ({
      ...qualifiedCollaborator(initial, athleteCourse),
      training: undefined,
      instructorForms: ["form-1"] as FormId[],
      ...extra,
    });
    const profile = (training: FormTraining, by?: Collaborator) => {
      const result = getExamProfile(initial, training, by);
      return result && { failure: Math.round(result.failureChance * 100), penalty: result.penaltyShare };
    };

    it("sets the exam odds by who teaches and how the course started", () => {
      expect(profile(athleteCourse, teacher({}))).toEqual({ failure: 55, penalty: 0.1 });
      expect(profile(athleteCourse, teacher({ eLearningInstructorForms: ["form-1"] })))
        .toEqual({ failure: 70, penalty: 0.25 });
      expect(profile(athleteCourse, teacher({ technicianForms: ["form-1"] })))
        .toEqual({ failure: 40, penalty: 0.1 });
      // An e-Learning Istruttore of another Form teaches this one normally.
      expect(profile(athleteCourse, teacher({ eLearningInstructorForms: ["form-2"] })))
        .toEqual({ failure: 55, penalty: 0.1 });
      // Self-taught: malus only when e-Learning started it, not from the button.
      expect(profile({ ...athleteCourse, eLearning: true })).toEqual({ failure: 70, penalty: 0.25 });
      expect(profile(athleteCourse)).toEqual({ failure: 55, penalty: 0.1 });
      // Taught by a normal colleague, an e-Learning course has no athlete malus.
      expect(profile({ ...athleteCourse, eLearning: true }, teacher({}))).toEqual({ failure: 55, penalty: 0.1 });
      expect(profile({ ...instructorCourse, eLearning: true })).toEqual({ failure: 65, penalty: 0.25 });
      expect(profile({ ...instructorCourse, refresher: true })).toEqual({ failure: 50, penalty: 0.1 });
      expect(profile(instructorCourse)).toEqual({ failure: 50, penalty: 0.1 });
    });

    const seedWith = (test: (roll: number) => boolean) =>
      Array.from({ length: 500 }, (_, index) => index + 1).find((seed) => test(nextRandom(seed)[0]))!;
    const resolve = (training: FormTraining, extra: Partial<Collaborator>, randomSeed: number) => gameReducer({
      ...initial,
      contacts: [],
      collaborators: [{ ...qualifiedCollaborator(initial, training), ...extra }],
      randomSeed,
    }, { type: "TICK", now: 2_000 }).collaborators[0];
    const timed: FormTraining = {
      ...instructorCourse,
      startedAt: 1_000,
      completesAt: 2_000,
      status: "running",
      trainingBaseDurationMs: 10_000,
      trainingDurationMultiplier: 1,
    };

    it("delays a failed e-Learning qualification by 25%", () => {
      const failed = resolve({ ...timed, eLearning: true }, {}, seedWith((roll) => roll < 0.5));
      expect(failed.training?.completesAt).toBe(4_500);
    });

    it("marks the Form after e-Learning and clears it with a refresher or the Corso Tecnici", () => {
      const pass = seedWith((roll) => roll > 0.9);
      const eLearned = resolve({ ...timed, eLearning: true }, {}, pass);
      expect(eLearned.instructorForms).toEqual(["form-1"]);
      expect(eLearned.eLearningInstructorForms).toEqual(["form-1"]);

      const marked = { instructorForms: ["form-1"] as FormId[], eLearningInstructorForms: ["form-1"] as FormId[] };
      expect(resolve({ ...timed, refresher: true }, marked, pass).eLearningInstructorForms).toEqual([]);
      const technician = resolve({ ...timed, trainingPhase: "technician", trainingTrack: "technician" }, marked, pass);
      expect(technician.technicianForms).toEqual(["form-1"]);
      expect(technician.eLearningInstructorForms).toEqual([]);
    });
  });
});
