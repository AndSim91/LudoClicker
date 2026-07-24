import { describe, expect, it } from "vitest";
import {
  getCollaboratorProductivity,
  getInstructorFormCost,
  getInstructorFormDuration,
  getInstructorQualificationCost,
  getInstructorQualificationDuration,
  getInternalInstructorQualificationCost,
  getTechnicianCourseCost,
  getTechnicianCourseDuration,
} from "../content/forms";
import { gameReducer } from "./engine";
import { createInitialState } from "./initialState";
import {
  bookTechnicianCourse,
  getTrainingDurationMultiplier,
  processAutomaticInstructorQualifications,
  processPriorityInstructorQualifications,
  processTechnicianCourseReservations,
} from "./teacherTrainingFlow";
import type { Collaborator, FormId, GameState } from "./types";

function instructor(
  state: GameState,
  id: string,
  joinedAt: number,
  forms: FormId[],
  instructorForms: FormId[],
  technicianForms: FormId[] = [],
): Collaborator {
  return {
    id,
    contactId: `${id}-contact`,
    displayName: id,
    joinedAt,
    forms,
    instructorForms,
    technicianForms,
    formBranchPreferences: [],
    assignment: "instructor",
    mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
    rarity: state.collaborators[0]?.rarity ?? "ultra-rare",
  };
}

describe("Tecnici e Corsi Istruttori interni", () => {
  it("uses the agreed cost and duration percentages", () => {
    expect(getInstructorQualificationCost(100)).toBe(250);
    expect(getInstructorFormCost(100)).toBe(350);
    expect(getInternalInstructorQualificationCost(100)).toBe(187.5);
    expect(getTechnicianCourseCost(100)).toBe(1_000);
    expect(getInstructorQualificationDuration(20_000)).toBe(15_000);
    expect(getInstructorFormDuration(20_000)).toBe(35_000);
    expect(getTechnicianCourseDuration(20_000)).toBe(200_000);
  });

  it("charges a SIS booking immediately and starts it in the next July", () => {
    const initial = createInitialState(1_000, "", false);
    const candidate = instructor(
      initial,
      "sis-candidate",
      1_000,
      ["form-1"],
      ["form-1"],
    );
    const september = {
      ...initial,
      school: { ...initial.school, currentMonth: 9, euros: 1_000 },
      collaborators: [candidate],
    };

    const booked = bookTechnicianCourse(september, candidate.id, "form-1", 2_000);

    expect(booked.school.euros).toBe(
      1_000 - getTechnicianCourseCost(50),
    );
    expect(booked.collaborators[0].training).toBeUndefined();
    expect(booked.collaborators[0].technicianCourseReservation).toEqual({
      formId: "form-1",
      bookedAt: 2_000,
      eligibleMonth: 19,
    });

    const july = processTechnicianCourseReservations({
      ...booked,
      school: { ...booked.school, currentMonth: 19 },
    }, 3_000);
    const expectedBaseDuration = getTechnicianCourseDuration(20_000) /
      getCollaboratorProductivity(candidate, "instructor");

    expect(july.collaborators[0].technicianCourseReservation).toBeUndefined();
    expect(july.collaborators[0].training).toMatchObject({
      formId: "form-1",
      trainingTrack: "technician",
      trainingPhase: "technician",
      trainingBaseDurationMs: expectedBaseDuration,
    });
    expect(july.collaborators[0].training?.completesAt).toBe(
      3_000 + Math.round(expectedBaseDuration / 2),
    );
    expect(july.collaborators[0].formTrainingYearCount).toBeUndefined();
  });

  it("keeps a paid July booking queued while busy and starts it later", () => {
    const initial = createInitialState(1_000, "", false);
    const candidate = {
      ...instructor(initial, "busy-candidate", 1_000, ["form-1"], ["form-1"]),
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 50_000,
        trainingTrack: "athlete" as const,
        trainingPhase: "athlete" as const,
      },
    };
    const july = {
      ...initial,
      school: { ...initial.school, currentMonth: 7, euros: 1_000 },
      collaborators: [candidate],
    };

    const booked = bookTechnicianCourse(july, candidate.id, "form-1", 2_000);
    expect(booked.collaborators[0].technicianCourseReservation?.eligibleMonth).toBe(7);
    expect(booked.collaborators[0].training?.trainingTrack).toBe("athlete");

    const september = processTechnicianCourseReservations({
      ...booked,
      school: { ...booked.school, currentMonth: 9 },
      collaborators: booked.collaborators.map((collaborator) => ({
        ...collaborator,
        training: undefined,
      })),
    }, 60_000);
    expect(september.collaborators[0].training?.trainingTrack).toBe("technician");
  });

  it("uses one trainee per Tecnico and respects the lowest progression first", () => {
    const initial = createInitialState(1_000, "", false);
    const technician = instructor(
      initial,
      "technician",
      1_000,
      ["form-1", "course-x"],
      ["form-1", "course-x"],
      ["form-1", "course-x"],
    );
    const lowerForm = instructor(initial, "lower-form", 3_000, ["form-1"], []);
    const earlierHigherForm = instructor(initial, "higher-form", 2_000, ["course-x"], []);
    const ready = {
      ...initial,
      contacts: [],
      school: { ...initial.school, currentMonth: 9, euros: 1_000 },
      collaborators: [technician, earlierHigherForm, lowerForm],
    };

    const started = processAutomaticInstructorQualifications(ready, 4_000);
    const active = started.collaborators.filter((collaborator) => collaborator.training);

    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(lowerForm.id);
    expect(active[0].training).toMatchObject({
      formId: "form-1",
      technicianId: technician.id,
      trainingTrack: "instructor",
      trainingPhase: "instructor",
    });
    expect(started.school.euros).toBe(
      1_000 - getInternalInstructorQualificationCost(50),
    );
  });

  it("gives the Instructor-Technician's new Instructor course first priority", () => {
    const initial = createInitialState(1_000, "", false);
    const technician = {
      ...instructor(
        initial,
        "sole-technician",
        1_000,
        ["form-1", "course-x"],
        ["form-1", "course-x"],
        ["form-1"],
      ),
      technicianCourseReservation: {
        formId: "course-x" as const,
        bookedAt: 1_500,
        eligibleMonth: 9,
      },
    };
    const trainee = instructor(initial, "registered-trainee", 2_000, ["form-1"], []);
    const athlete = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: [] as FormId[],
      training: undefined,
    };
    const ready: GameState = {
      ...initial,
      contacts: [athlete],
      school: {
        ...initial.school,
        currentMonth: 9,
        activeMembers: 1,
        euros: 10_000,
      },
      collaborators: [technician, trainee],
      unlocks: { ...initial.unlocks, forms: true, collaborators: true },
      upgrades: { ...initial.upgrades, "athletic-preparation": 1 },
      automation: { ...initial.automation, lessonBuffer: 0.99 },
    };

    const processed = gameReducer(ready, { type: "TICK", now: 2_000 });
    const processedTechnician = processed.collaborators.find(
      (collaborator) => collaborator.id === technician.id,
    );
    const processedTrainee = processed.collaborators.find(
      (collaborator) => collaborator.id === trainee.id,
    );

    expect(processedTrainee?.training).toMatchObject({
      formId: "form-1",
      technicianId: technician.id,
      trainingTrack: "instructor",
      trainingPhase: "instructor",
    });
    expect(processed.contacts[0].training).toBeUndefined();
    expect(processedTechnician?.training).toBeUndefined();
    expect(processedTechnician?.technicianCourseReservation).toEqual(
      technician.technicianCourseReservation,
    );
    expect(processed.automation.lessonBuffer).toBe(0.99);
  });

  it("keeps the Technician on the priority course while another Instructor teaches athletes", () => {
    const initial = createInitialState(1_000, "", false);
    const technician = instructor(
      initial,
      "covered-technician",
      1_000,
      ["form-1"],
      ["form-1"],
      ["form-1"],
    );
    const backup = instructor(
      initial,
      "backup-instructor",
      1_500,
      ["form-1"],
      ["form-1"],
    );
    const trainee = instructor(initial, "covered-trainee", 2_000, ["form-1"], []);
    const athlete = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: [] as FormId[],
      training: undefined,
    };
    const ready: GameState = {
      ...initial,
      contacts: [athlete],
      school: {
        ...initial.school,
        currentMonth: 9,
        activeMembers: 1,
        euros: 1_000,
      },
      collaborators: [technician, backup, trainee],
      unlocks: { ...initial.unlocks, forms: true, collaborators: true },
    };

    const processed = gameReducer(ready, { type: "TICK", now: 4_000 });
    const processedTrainee = processed.collaborators.find(
      (collaborator) => collaborator.id === trainee.id,
    );

    expect(processedTrainee?.training).toMatchObject({
      technicianId: technician.id,
      trainingTrack: "instructor",
      trainingPhase: "instructor",
    });
    expect(processed.contacts[0].training).toMatchObject({
      formId: "form-1",
      instructorId: backup.id,
    });
  });

  it("requires an aspiring Instructor to be assigned to the Instructor role", () => {
    const initial = createInitialState(1_000, "", false);
    const technician = instructor(
      initial,
      "eligibility-technician",
      1_000,
      ["form-1"],
      ["form-1"],
      ["form-1"],
    );
    const nonInstructor = {
      ...instructor(initial, "non-instructor", 2_000, ["form-1"], []),
      assignment: "writing" as const,
    };
    const ready = {
      ...initial,
      contacts: [],
      school: { ...initial.school, currentMonth: 9, euros: 1_000 },
      collaborators: [technician, nonInstructor],
    };

    const prioritized = processPriorityInstructorQualifications(ready, 4_000);
    const standard = processAutomaticInstructorQualifications(ready, 4_000);

    expect(prioritized).toBe(ready);
    expect(standard).toBe(ready);
    expect(nonInstructor.training).toBeUndefined();
  });

  it("prefers the most useful certificate, then the earliest collaborator", () => {
    const initial = createInitialState(1_000, "", false);
    const technician = instructor(
      initial,
      "branch-technician",
      1_000,
      ["form-3-long", "form-3-staff"],
      ["form-3-long", "form-3-staff"],
      ["form-3-long", "form-3-staff"],
    );
    const longCandidate = instructor(initial, "long", 1_500, ["form-3-long"], []);
    const laterStaff = instructor(initial, "staff-later", 3_000, ["form-3-staff"], []);
    const earlierStaff = instructor(initial, "staff-earlier", 2_000, ["form-3-staff"], []);
    const waitingStudents = [0, 1].map((index) => ({
      ...initial.contacts[index],
      id: `waiting-staff-${index}`,
      status: "enrolled" as const,
      forms: ["form-1", "course-x", "form-2", "course-y"] as FormId[],
      formBranchPreferences: ["Staffa" as const],
    }));
    const ready = {
      ...initial,
      contacts: waitingStudents,
      school: { ...initial.school, currentMonth: 9, euros: 5_000 },
      collaborators: [technician, longCandidate, laterStaff, earlierStaff],
    };

    const started = processAutomaticInstructorQualifications(ready, 4_000);
    const trainee = started.collaborators.find((collaborator) => collaborator.training);

    expect(trainee?.id).toBe(earlierStaff.id);
    expect(trainee?.training?.formId).toBe("form-3-staff");
  });

  it("combines PagoSport and summer speed additively, then applies the teaching slowdown", () => {
    const initial = createInitialState(1_000, "", false);
    const technician = instructor(
      initial,
      "speed-technician",
      1_000,
      ["form-1"],
      ["form-1"],
      ["form-1"],
    );
    const technicalTraining = {
      formId: "form-1" as const,
      startedAt: 1_000,
      completesAt: 2_000,
      trainingTrack: "technician" as const,
      trainingPhase: "technician" as const,
    };
    const summerPago = {
      ...initial,
      school: { ...initial.school, currentMonth: 7 },
      collaborators: [{ ...technician, training: technicalTraining }],
      upgrades: { ...initial.upgrades, pagosport: 3 },
    };

    expect(getTrainingDurationMultiplier(
      summerPago,
      technician.id,
      technicalTraining,
    )).toBeCloseTo(1 / 3);
    expect(getTrainingDurationMultiplier(
      summerPago,
      technician.id,
      { ...technicalTraining, trainingTrack: "instructor", trainingPhase: "instructor" },
    )).toBeCloseTo(1 / 2.5);
    expect(getTrainingDurationMultiplier(
      summerPago,
      technician.id,
      { ...technicalTraining, trainingTrack: "athlete", trainingPhase: "athlete" },
    )).toBeCloseTo(1 / 1.5);
    expect(getTrainingDurationMultiplier(
      summerPago,
      technician.id,
      {
        ...technicalTraining,
        formId: "agonist-course",
        trainingTrack: "agonist",
        trainingPhase: "agonist",
      },
    )).toBeCloseTo(1 / 1.5);

    const teaching = {
      ...summerPago,
      contacts: [{
        ...initial.contacts[0],
        status: "enrolled" as const,
        training: {
          formId: "form-1" as const,
          startedAt: 1_000,
          completesAt: 50_000,
          instructorId: technician.id,
        },
      }],
    };
    expect(getTrainingDurationMultiplier(
      teaching,
      technician.id,
      technicalTraining,
    )).toBe(1);
  });
});
