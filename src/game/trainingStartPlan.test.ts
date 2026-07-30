import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { getStudentFormCost } from "../content/forms";
import { processAutomaticTeaching } from "./automationFlow";
import { createInitialState } from "./initialState";
import {
  startAgonistCourse,
  startFormTraining,
} from "./trainingFlow";
import { createTrainingStartPlan } from "./trainingStartPlan";
import type {
  Collaborator,
  Contact,
  FormId,
  GameState,
} from "./types";

const NOW = 2_000;

function member(
  template: Contact,
  id: string,
  forms: FormId[],
  acquiredAt: number,
  favorite = false,
): Contact {
  return {
    ...template,
    id,
    firstName: id,
    lastName: "Test",
    email: `${id}@example.test`,
    acquiredAt,
    status: "enrolled",
    forms: [...forms],
    formBranchPreferences: forms.includes("course-y") ? ["Staffa"] : [],
    training: undefined,
    lastFormTrainingYear: undefined,
    formTrainingYearCount: undefined,
    lastAgonistCourseYear: undefined,
    favorite,
    specialProfileId: undefined,
    secretLegendaryId: undefined,
  };
}

function instructor(
  id: string,
  forms: FormId[],
  joinedAt: number,
): Collaborator {
  return {
    id,
    contactId: `external-${id}`,
    displayName: id,
    joinedAt,
    forms: [...forms],
    instructorForms: [...forms],
    technicianForms: [],
    formBranchPreferences: [],
    assignment: "instructor",
    mastery: createInitialCollaboratorMastery(),
    rarity: "legendary",
  };
}

function processSequentially(state: GameState): GameState {
  return processAutomaticTeaching(
    state,
    NOW,
    startFormTraining,
    startAgonistCourse,
  );
}

function processAsBatch(state: GameState): GameState {
  return processAutomaticTeaching(
    state,
    NOW,
    startFormTraining,
    startAgonistCourse,
    createTrainingStartPlan,
  );
}

describe("batched automatic teaching plan", () => {
  it("matches the sequential flow for costs, equipment, priorities and durations", () => {
    const initial = createInitialState(1_000, "", false);
    const template = initial.contacts[0];
    const senior = {
      ...instructor(
        "senior",
        ["form-1", "course-x", "form-2", "course-y", "form-3-staff"],
        1_000,
      ),
      training: {
        formId: "form-3-long" as const,
        startedAt: 1_500,
        completesAt: 41_500,
        status: "running" as const,
        instructorId: "assistant",
        equipmentUsed: 1,
        wearPerSword: 10,
        trainingTrack: "athlete" as const,
        trainingPhase: "athlete" as const,
        trainingBaseDurationMs: 40_000,
        trainingDurationMultiplier: 1,
        instructorTrainingDurationMultiplier: 1,
      },
    };
    const assistant = instructor("assistant", ["form-1"], 1_100);
    const junior = instructor("junior", ["form-1"], 1_200);
    const contacts = [
      member(template, "favorite", [], 1_900, true),
      member(template, "new-member", [], 1_800),
      member(template, "course-x-member", ["form-1"], 1_700),
      member(template, "form-two-member", ["form-1", "course-x"], 1_600),
      member(
        template,
        "staff-member",
        ["form-1", "course-x", "form-2", "course-y"],
        1_500,
      ),
      {
        ...member(
          template,
          "agonist-member",
          ["form-1", "course-x", "form-2", "course-y"],
          1_400,
        ),
        formBranchPreferences: ["Spada Lunga" as const],
      },
    ];
    const state: GameState = {
      ...initial,
      contacts,
      collaborators: [senior, assistant, junior],
      school: {
        ...initial.school,
        activeMembers: contacts.length,
        currentMonth: 9,
        euros: 50_000,
      },
      equipment: {
        totalSwords: 5,
        availableSwords: 4,
        damagedSwords: 1,
        wear: 0,
      },
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: {
        ...initial.upgrades,
        "project-x": 1,
        "technical-arena": 3,
        "promiscuous-instructor": 1,
        "tiamat-instructor": 4,
      },
    };

    const sequential = processSequentially(state);
    const batched = processAsBatch(state);

    expect(batched).toEqual(sequential);
    expect(batched.contacts.some((contact) =>
      contact.training?.status === "waitingForEquipment"
    )).toBe(true);
    expect(batched.contacts.some((contact) =>
      contact.training?.formId === "agonist-course"
    )).toBe(true);
    expect(
      batched.collaborators.find((collaborator) => collaborator.id === senior.id)
        ?.training?.instructorTrainingDurationMultiplier,
    ).toBe(3);
  });

  it("preserves student-only training while waiting for equipment", () => {
    const initial = createInitialState(1_000, "", false);
    const collaborator = {
      ...instructor("student-only-instructor", ["form-1"], 1_000),
      instructorForms: [] as FormId[],
    };
    const state: GameState = {
      ...initial,
      collaborators: [collaborator],
      school: {
        ...initial.school,
        currentMonth: 9,
        euros: 1_000,
      },
      equipment: {
        totalSwords: 0,
        availableSwords: 0,
        damagedSwords: 0,
        wear: 0,
      },
      unlocks: { ...initial.unlocks, forms: true },
    };
    const waitingPlan = createTrainingStartPlan(state, NOW, new Map());

    waitingPlan.startFormTraining(collaborator.id, "form-2", "student-only");
    const waitingState = waitingPlan.commit();
    expect(waitingState.collaborators[0].training).toMatchObject({
      formId: "form-2",
      status: "waitingForEquipment",
      trainingTrack: "athlete",
    });

    const restartPlan = createTrainingStartPlan({
      ...waitingState,
      equipment: {
        totalSwords: 1,
        availableSwords: 1,
        damagedSwords: 0,
        wear: 0,
      },
    }, NOW + 1_000, new Map());
    restartPlan.restartWaitingTraining(collaborator.id);
    const restartedState = restartPlan.commit();

    expect(restartedState.school.euros).toBe(750);
    expect(restartedState.collaborators[0].training).toMatchObject({
      formId: "form-2",
      status: "running",
      trainingTrack: "athlete",
      trainingPhase: "athlete",
    });
    expect(restartedState.collaborators[0].training?.includesInstructorCertification)
      .toBeUndefined();
  });

  it("starts 1,000 members without changing capacity or economy rules", () => {
    const initial = createInitialState(1_000, "", false);
    const template = initial.contacts[0];
    const contacts = Array.from({ length: 1_000 }, (_, index) =>
      member(template, `member-${index}`, [], 10_000 - index)
    );
    const collaborators = Array.from({ length: 167 }, (_, index) =>
      instructor(`instructor-${index}`, ["form-1"], index)
    );
    const state: GameState = {
      ...initial,
      contacts,
      collaborators,
      school: {
        ...initial.school,
        activeMembers: contacts.length,
        currentMonth: 9,
        euros: 100_000,
      },
      equipment: {
        totalSwords: contacts.length,
        availableSwords: contacts.length,
        damagedSwords: 0,
        wear: 0,
      },
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: {
        ...initial.upgrades,
        "promiscuous-instructor": 5,
      },
    };

    const sequential = processSequentially(state);
    const processed = processAsBatch(state);

    expect(processed).toEqual(sequential);
    expect(processed.contacts.filter((contact) => contact.training)).toHaveLength(1_000);
    expect(processed.equipment.availableSwords).toBe(0);
    expect(processed.school.euros).toBe(
      100_000 - 1_000 * getStudentFormCost(50),
    );
    const teachingCounts = new Map<string, number>();
    for (const contact of processed.contacts) {
      const instructorId = contact.training?.instructorId;
      if (!instructorId) continue;
      teachingCounts.set(instructorId, (teachingCounts.get(instructorId) ?? 0) + 1);
    }
    expect(Math.max(...teachingCounts.values())).toBe(6);
  });
});
