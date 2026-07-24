import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { createInitialState } from "./initialState";
import { gameReducer } from "./engine";
import { selectAvailableInstructor } from "./selectors";
import type { Collaborator, Contact, FormId, GameState } from "./types";

function instructor(
  id: string,
  rarity: Collaborator["rarity"],
  instructorForms: FormId[] = [],
): Collaborator {
  return {
    id,
    contactId: `external-${id}`,
    displayName: id,
    joinedAt: 1_000,
    forms: [...instructorForms],
    instructorForms: [...instructorForms],
    formBranchPreferences: [],
    assignment: "instructor",
    mastery: createInitialCollaboratorMastery(),
    rarity,
  };
}

function branchStudent(
  contact: Contact,
  id: string,
  preference: "Staffa" | "Spada Lunga" = "Staffa",
): Contact {
  return {
    ...contact,
    id,
    status: "enrolled",
    forms: ["form-1", "course-x", "form-2", "course-y"],
    formBranchPreferences: [preference],
    training: undefined,
  };
}

function teachingState(): GameState {
  const initial = createInitialState(1_000);
  return {
    ...initial,
    school: {
      ...initial.school,
      activeMembers: 2,
      euros: 10_000,
    },
    unlocks: {
      ...initial.unlocks,
      forms: true,
    },
    upgrades: {
      ...initial.upgrades,
      "technical-arena": 3,
    },
  };
}

describe("automatic teaching rules", () => {
  it("waits for a busy certified instructor instead of using the Agonist Course", () => {
    const initial = teachingState();
    const waiting = branchStudent(initial.contacts[0], "waiting");
    const alreadyTraining = {
      ...branchStudent(initial.contacts[1], "already-training"),
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 10_000,
        status: "running" as const,
        instructorId: "certified",
      },
    };
    const certified = instructor(
      "certified",
      "ultra-rare",
      ["form-3-staff"],
    );
    const freeButUnqualified = instructor("free", "legendary");
    const state: GameState = {
      ...initial,
      contacts: [waiting, alreadyTraining],
      collaborators: [certified, freeButUnqualified],
    };

    const processed = gameReducer(state, { type: "TICK", now: 2_000 });

    expect(processed.contacts.find((contact) => contact.id === waiting.id)?.training)
      .toBeUndefined();
  });

  it("uses the Agonist Course when no assigned instructor has a compatible certificate", () => {
    const initial = teachingState();
    const student = branchStudent(initial.contacts[0], "staff-student");
    const unrelatedCertificate = instructor(
      "long-only",
      "legendary",
      ["form-3-long"],
    );
    const state: GameState = {
      ...initial,
      school: { ...initial.school, activeMembers: 1 },
      contacts: [student],
      collaborators: [unrelatedCertificate],
    };

    const processed = gameReducer(state, { type: "TICK", now: 2_000 });
    const training = processed.contacts[0].training;

    expect(training?.formId).toBe("agonist-course");
    expect(training?.instructorId).toBe(unrelatedCertificate.id);
  });

  it("selects lower load before productivity, then the most productive instructor", () => {
    const initial = teachingState();
    const weak = instructor("weak", "ultra-rare", ["form-1"]);
    const strong = instructor("strong", "legendary", ["form-1"]);
    const loadedStudent = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 10_000,
        status: "running" as const,
        instructorId: strong.id,
      },
    };
    const state: GameState = {
      ...initial,
      contacts: [loadedStudent],
      collaborators: [strong, weak],
      upgrades: {
        ...initial.upgrades,
        "promiscuous-instructor": 1,
      },
    };

    expect(selectAvailableInstructor(state, "form-1")?.id).toBe(weak.id);
    expect(selectAvailableInstructor(
      { ...state, contacts: [] },
      "form-1",
    )?.id).toBe(strong.id);
  });

  it("reserves instructor capacity while students wait for equipment", () => {
    const initial = teachingState();
    const students = Array.from({ length: 8 }, (_, index) =>
      branchStudent(initial.contacts[index % initial.contacts.length], `waiting-${index}`),
    );
    const certified = instructor("certified", "legendary", ["form-3-staff"]);
    const state: GameState = {
      ...initial,
      school: { ...initial.school, activeMembers: students.length },
      contacts: students,
      collaborators: [certified],
      equipment: {
        ...initial.equipment,
        availableSwords: 0,
        damagedSwords: initial.equipment.totalSwords,
      },
      upgrades: {
        ...initial.upgrades,
        "promiscuous-instructor": 1,
        "tiamat-instructor": 4,
      },
    };

    const firstTick = gameReducer(state, { type: "TICK", now: 2_000 });
    const secondTick = gameReducer(firstTick, { type: "TICK", now: 3_000 });
    const firstTrainings = firstTick.contacts.flatMap((contact) =>
      contact.training ? [contact.training] : [],
    );

    expect(firstTrainings).toHaveLength(6);
    expect(firstTrainings.every((training) =>
      training.status === "waitingForEquipment" &&
      training.requestedInstructorId === certified.id
    )).toBe(true);
    expect(secondTick.contacts.filter((contact) => contact.training)).toHaveLength(6);
  });
});
