import { describe, expect, it } from "vitest";
import {
  getFormDefinition,
  getStudentFormCost,
} from "../content/forms";
import { createInitialState, gameReducer } from "./engine";
import type { Collaborator, FormId, GameState } from "./types";

const BASIC_FORMS: FormId[] = ["form-1", "course-x"];
const FORM_TWO_COST = getFormDefinition("form-2")!.cost;

function assignedInstructor(
  id: string,
  joinedAt: number,
  forms: FormId[],
  instructorForms: FormId[],
  technicianForms: FormId[] = [],
): Collaborator {
  return {
    id,
    contactId: "external-" + id,
    displayName: id,
    joinedAt,
    forms: [...forms],
    instructorForms: [...instructorForms],
    technicianForms: [...technicianForms],
    assignment: "instructor",
    rarity: "legendary",
  };
}

function colleagueTrainingState(teacherIsTechnician: boolean): {
  state: GameState;
  teacher: Collaborator;
  trainee: Collaborator;
} {
  const initial = createInitialState(1_000, "", false);
  const teacher = assignedInstructor(
    "senior-instructor",
    1_000,
    [...BASIC_FORMS, "form-2"],
    [...BASIC_FORMS, "form-2"],
    teacherIsTechnician ? ["form-2"] : [],
  );
  const trainee = assignedInstructor(
    "junior-instructor",
    1_500,
    BASIC_FORMS,
    BASIC_FORMS,
  );
  return {
    teacher,
    trainee,
    state: {
      ...initial,
      contacts: [],
      collaborators: [teacher, trainee],
      school: {
        ...initial.school,
        activeMembers: 0,
        currentMonth: 9,
        euros: 10_000,
        nextFeeAt: Number.MAX_SAFE_INTEGER,
      },
      unlocks: {
        ...initial.unlocks,
        collaborators: true,
        forms: true,
      },
    },
  };
}

describe("Instructor colleague training", () => {
  it("lets an assigned Instructor learn a Form automatically from a qualified colleague", () => {
    const { state, teacher, trainee } = colleagueTrainingState(false);

    const started = gameReducer(state, { type: "TICK", now: 2_000 });
    const traineeInTraining = started.collaborators.find(
      (collaborator) => collaborator.id === trainee.id,
    )!;

    expect(traineeInTraining.training).toMatchObject({
      formId: "form-2",
      instructorId: teacher.id,
      trainingTrack: "athlete",
      trainingPhase: "athlete",
    });
    expect(traineeInTraining.training?.includesInstructorCertification).toBeUndefined();
    expect(traineeInTraining.formTrainingYearCount).toBe(1);
    expect(started.school.euros).toBe(
      state.school.euros - getStudentFormCost(FORM_TWO_COST),
    );

    const learned = gameReducer(
      { ...started, randomSeed: 1 },
      {
        type: "TICK",
        now: traineeInTraining.training!.completesAt,
      },
    );
    const trainedInstructor = learned.collaborators.find(
      (collaborator) => collaborator.id === trainee.id,
    )!;

    expect(trainedInstructor.forms).toContain("form-2");
    expect(trainedInstructor.instructorForms).not.toContain("form-2");
    expect(trainedInstructor.training).toBeUndefined();
    expect(trainedInstructor.formTrainingYearCount).toBe(1);
  });

  it("chains the internal Instructor course when the colleague is also a Technician", () => {
    const { state, teacher, trainee } = colleagueTrainingState(true);
    const started = gameReducer(state, { type: "TICK", now: 2_000 });
    const athleteTraining = started.collaborators.find(
      (collaborator) => collaborator.id === trainee.id,
    )!.training!;

    const qualifying = gameReducer(
      { ...started, randomSeed: 1 },
      { type: "TICK", now: athleteTraining.completesAt },
    );
    const traineeInQualification = qualifying.collaborators.find(
      (collaborator) => collaborator.id === trainee.id,
    )!;

    expect(traineeInQualification.forms).toContain("form-2");
    expect(traineeInQualification.instructorForms).not.toContain("form-2");
    expect(traineeInQualification.training).toMatchObject({
      formId: "form-2",
      technicianId: teacher.id,
      trainingTrack: "instructor",
      trainingPhase: "instructor",
    });
    expect(traineeInQualification.formTrainingYearCount).toBe(1);
    expect(qualifying.school.euros).toBeLessThan(started.school.euros);

    const qualified = gameReducer(
      { ...qualifying, randomSeed: 1 },
      {
        type: "TICK",
        now: traineeInQualification.training!.completesAt,
      },
    );
    const qualifiedInstructor = qualified.collaborators.find(
      (collaborator) => collaborator.id === trainee.id,
    )!;

    expect(qualifiedInstructor.forms).toContain("form-2");
    expect(qualifiedInstructor.instructorForms).toContain("form-2");
    expect(qualifiedInstructor.training).toBeUndefined();
    expect(qualifiedInstructor.formTrainingYearCount).toBe(1);
  });
});
