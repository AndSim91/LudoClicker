import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import {
  decrementCollaboratorAssignment,
  getCollaboratorAssignmentCounts,
  incrementCollaboratorAssignment,
  moveOperationalPriority,
  reconcileCollaboratorManagement,
  setCollaboratorFallback,
} from "./collaboratorManagement";
import { getCollaboratorFallbackProductivity } from "./collaboratorFallback";
import { createInitialState } from "./initialState";
import { gameReducer } from "./engine";
import type { Collaborator, CollaboratorAssignment, GameState } from "./types";

function collaborator(
  index: number,
  assignment: CollaboratorAssignment = null,
): Collaborator {
  return {
    id: `collaborator-${index}`,
    contactId: `contact-${index}`,
    displayName: `Collaboratore ${index}`,
    joinedAt: 1_000 + index,
    forms: [],
    instructorForms: [],
    formBranchPreferences: [],
    assignment,
    mastery: createInitialCollaboratorMastery(),
    rarity: "ultra-rare",
  };
}

describe("collaborator aggregate management", () => {
  it("unlocks permanently when the ninth collaborator joins", () => {
    const initial = createInitialState(1_000);
    const unlocked = reconcileCollaboratorManagement({
      ...initial,
      collaborators: Array.from({ length: 9 }, (_, index) => collaborator(index)),
    });

    expect(unlocked.collaboratorManagement.aggregateViewUnlocked).toBe(true);

    const afterDepartures = reconcileCollaboratorManagement({
      ...unlocked,
      collaborators: unlocked.collaborators.slice(0, 3),
    });
    expect(afterDepartures.collaboratorManagement.aggregateViewUnlocked).toBe(true);
  });

  it("keeps missing positions and fills them as soon as a collaborator becomes available", () => {
    const initial = createInitialState(1_000);
    const configured: GameState = {
      ...initial,
      collaborators: [collaborator(1), collaborator(2)],
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
        targets: { writing: 3, events: 0, equipment: 0, instructor: 0 },
      },
    };
    const applied = reconcileCollaboratorManagement(configured);

    expect(applied.collaborators.map((candidate) => candidate.assignment)).toEqual([
      "writing",
      "writing",
    ]);
    expect(applied.collaboratorManagement.targets.writing).toBe(3);

    const filled = reconcileCollaboratorManagement({
      ...applied,
      collaborators: [...applied.collaborators, collaborator(3)],
    });
    expect(filled.collaborators[2].assignment).toBe("writing");
  });

  it("waits for an active event before moving its collaborator", () => {
    const initial = createInitialState(1_000);
    const eventCollaborator = collaborator(1, "events");
    const event = {
      id: "event-1",
      definitionId: "park-sparring" as const,
      title: "Volantinaggio",
      location: "Parco",
      startedAt: 1_000,
      resolvesAt: 5_000,
      cost: 0,
      peopleMet: 0,
      demonstrationsGiven: 0,
      contactReward: 0,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      collaboratorId: eventCollaborator.id,
      status: "running" as const,
    };
    const unlocked: GameState = {
      ...initial,
      collaborators: [eventCollaborator],
      acquisitionEvents: [event],
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
      },
    };
    const applied = reconcileCollaboratorManagement({
      ...unlocked,
      collaboratorManagement: {
        ...unlocked.collaboratorManagement,
        targets: { writing: 1, events: 0, equipment: 0, instructor: 0 },
      },
    });

    expect(applied.collaborators[0].assignment).toBe("events");

    const completed = reconcileCollaboratorManagement({
      ...applied,
      acquisitionEvents: [{ ...event, status: "completed" }],
    });
    expect(completed.collaborators[0].assignment).toBe("writing");
  });

  it("reassigns a completed event collaborator before automation can start another event", () => {
    const initial = createInitialState(1_000);
    const eventCollaborator = collaborator(1, "events");
    const unlocked: GameState = {
      ...initial,
      collaborators: [eventCollaborator],
      acquisitionEvents: [{
        id: "event-1",
        definitionId: "park-sparring",
        title: "Volantinaggio",
        location: "Parco",
        startedAt: 1_000,
        resolvesAt: 5_000,
        cost: 0,
        peopleMet: 0,
        demonstrationsGiven: 0,
        contactReward: 0,
        membersUsed: 0,
        equipmentUsed: 0,
        wearAdded: 0,
        collaboratorId: eventCollaborator.id,
        status: "running",
      }],
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
      },
    };
    const applied = reconcileCollaboratorManagement({
      ...unlocked,
      collaboratorManagement: {
        ...unlocked.collaboratorManagement,
        targets: {
        writing: 1,
        events: 0,
        equipment: 0,
        instructor: 0,
        },
      },
    });

    const completed = gameReducer(applied, { type: "TICK", now: 5_000 });

    expect(completed.collaborators[0].assignment).toBe("writing");
    expect(completed.acquisitionEvents.filter((event) => event.status === "running")).toHaveLength(0);
  });

  it("uses only unassigned collaborators for direct sector changes", () => {
    const initial = createInitialState(1_000);
    const unlocked = reconcileCollaboratorManagement({
      ...initial,
      collaborators: Array.from({ length: 9 }, (_, index) =>
        collaborator(index, index === 0 ? "events" : null)
      ),
    });

    const incremented = incrementCollaboratorAssignment(unlocked, "writing");

    expect(getCollaboratorAssignmentCounts(incremented)).toMatchObject({
      writing: 1,
      events: 1,
    });
  });

  it("removes the least productive free collaborator and defers busy decrements", () => {
    const initial = createInitialState(1_000);
    const weaker = {
      ...collaborator(1, "events"),
      rarity: "ultra-rare" as const,
    };
    const stronger = {
      ...collaborator(2, "events"),
      rarity: "legendary" as const,
    };
    const unlocked: GameState = {
      ...initial,
      collaborators: [weaker, stronger],
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
        targets: { writing: 0, events: 2, equipment: 0, instructor: 0 },
      },
    };

    const decremented = decrementCollaboratorAssignment(unlocked, "events");
    expect(decremented.collaborators.find((candidate) => candidate.id === weaker.id)?.assignment)
      .toBeNull();
    expect(decremented.collaborators.find((candidate) => candidate.id === stronger.id)?.assignment)
      .toBe("events");

    const event = {
      id: "event-busy",
      definitionId: "park-sparring" as const,
      title: "Sparring",
      location: "Parco",
      startedAt: 1_000,
      resolvesAt: 5_000,
      cost: 0,
      peopleMet: 0,
      demonstrationsGiven: 0,
      contactReward: 0,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      collaboratorId: stronger.id,
      status: "running" as const,
    };
    const pending = decrementCollaboratorAssignment({
      ...decremented,
      acquisitionEvents: [event],
    }, "events");
    expect(pending.collaboratorManagement.targets.events).toBe(0);
    expect(pending.collaborators.find((candidate) => candidate.id === stronger.id)?.assignment)
      .toBe("events");

    const completed = reconcileCollaboratorManagement({
      ...pending,
      acquisitionEvents: [{ ...event, status: "completed" }],
    });
    expect(completed.collaborators.find((candidate) => candidate.id === stronger.id)?.assignment)
      .toBeNull();
  });

  it("lets instructors finish current lessons without assigning new ones during check-out", () => {
    const initial = createInitialState(1_000, "", false);
    const activeInstructor = {
      ...collaborator(1, "instructor"),
      forms: ["form-1"] as Collaborator["forms"],
      instructorForms: ["form-1"] as Collaborator["instructorForms"],
    };
    const lesson = (id: string, completesAt: number) => ({
      ...initial.contacts[0],
      id,
      status: "enrolled" as const,
      forms: [] as Collaborator["forms"],
      training: {
        formId: "agonist-course" as const,
        startedAt: 1_000,
        completesAt,
        status: "running" as const,
        instructorId: activeInstructor.id,
        equipmentUsed: 0,
        wearPerSword: 0,
        agonistCourseGrantsStats: false,
      },
    });
    const waitingStudent = {
      ...initial.contacts[0],
      id: "waiting-student",
      status: "enrolled" as const,
      forms: [] as Collaborator["forms"],
      training: undefined,
    };
    const checkingOut: GameState = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 3,
        currentMonth: 9,
        euros: 10_000,
      },
      contacts: [
        lesson("first-lesson", 2_000),
        lesson("last-lesson", 10_000),
        waitingStudent,
      ],
      collaborators: [activeInstructor],
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
        targets: {
          ...initial.collaboratorManagement.targets,
          instructor: 0,
        },
      },
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: {
        ...initial.upgrades,
        "technical-arena": 3,
        "promiscuous-instructor": 1,
      },
    };

    const afterFirstLesson = gameReducer(checkingOut, { type: "TICK", now: 2_000 });

    expect(afterFirstLesson.contacts.find((contact) => contact.id === "first-lesson")?.training)
      .toBeUndefined();
    expect(afterFirstLesson.contacts.find((contact) => contact.id === "last-lesson")?.training)
      .toBeDefined();
    expect(afterFirstLesson.contacts.find((contact) => contact.id === waitingStudent.id)?.training)
      .toBeUndefined();
    expect(afterFirstLesson.collaborators[0].assignment).toBe("instructor");

    const afterLastLesson = gameReducer(afterFirstLesson, { type: "TICK", now: 10_000 });

    expect(afterLastLesson.contacts.find((contact) => contact.id === "last-lesson")?.training)
      .toBeUndefined();
    expect(afterLastLesson.collaborators[0].assignment).toBeNull();
  });

  it("cancels lessons still waiting for equipment when their instructor checks out", () => {
    const initial = createInitialState(1_000);
    const activeInstructor = collaborator(1, "instructor");
    const waitingStudent = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 1_000,
        status: "waitingForEquipment" as const,
        requestedInstructorId: activeInstructor.id,
        equipmentUsed: 1,
        wearPerSword: 10,
      },
    };
    const state: GameState = {
      ...initial,
      contacts: [waitingStudent],
      collaborators: [activeInstructor],
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
        targets: {
          ...initial.collaboratorManagement.targets,
          instructor: 1,
        },
      },
    };

    const checkedOut = decrementCollaboratorAssignment(state, "instructor");

    expect(checkedOut.contacts[0].training).toBeUndefined();
    expect(checkedOut.collaborators[0].assignment).toBeNull();
  });

  it("can cancel a pending instructor check-out without a free collaborator", () => {
    const initial = createInitialState(1_000);
    const busyInstructor = {
      ...collaborator(1, "instructor"),
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 10_000,
        status: "running" as const,
      },
    };
    const state: GameState = {
      ...initial,
      collaborators: [busyInstructor],
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
        targets: {
          ...initial.collaboratorManagement.targets,
          instructor: 0,
        },
      },
    };

    const restored = incrementCollaboratorAssignment(state, "instructor");

    expect(restored.collaboratorManagement.targets.instructor).toBe(1);
    expect(restored.collaborators[0].assignment).toBe("instructor");
  });

  it("prioritizes new certified coverage when adding an instructor", () => {
    const initial = createInitialState(1_000);
    const existing = {
      ...collaborator(0, "instructor"),
      forms: ["form-1"] as Collaborator["forms"],
      instructorForms: ["form-1"] as Collaborator["instructorForms"],
    };
    const duplicate = {
      ...collaborator(1),
      forms: ["form-1", "course-x"] as Collaborator["forms"],
      instructorForms: ["form-1"] as Collaborator["instructorForms"],
      rarity: "legendary" as const,
    };
    const varied = {
      ...collaborator(2),
      forms: ["course-x"] as Collaborator["forms"],
      instructorForms: ["course-x"] as Collaborator["instructorForms"],
    };
    const state: GameState = {
      ...initial,
      upgrades: { ...initial.upgrades, "project-x": 1 },
      collaborators: [
        existing,
        duplicate,
        varied,
      ],
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
        targets: { writing: 0, events: 0, equipment: 0, instructor: 1 },
      },
    };

    const incremented = incrementCollaboratorAssignment(state, "instructor");
    expect(incremented.collaborators.find((candidate) => candidate.id === varied.id)?.assignment)
      .toBe("instructor");
  });

  it("unlocks secondary shifts and operational priorities only at their upgrades", () => {
    const initial = createInitialState(1_000);

    expect(setCollaboratorFallback(initial, "events", "writing")).toBe(initial);
    expect(moveOperationalPriority(initial, "equipment", "up")).toBe(initial);

    const shiftsUnlocked = {
      ...initial,
      upgrades: { ...initial.upgrades, "collaborator-shifts": 1 },
    };
    const configured = setCollaboratorFallback(shiftsUnlocked, "events", "writing");
    expect(configured.collaboratorManagement.fallbackAssignments).toEqual({
      events: "writing",
    });
    expect(setCollaboratorFallback(configured, "events", "instructor")).toBe(configured);

    const prioritiesUnlocked = {
      ...configured,
      upgrades: { ...configured.upgrades, "operational-priorities": 1 },
    };
    expect(
      moveOperationalPriority(prioritiesUnlocked, "equipment", "up")
        .collaboratorManagement.operationalPriorities,
    ).toEqual(["writing", "equipment", "events", "instructor", "gadget"]);
  });

  it("uses Eventi as a secondary source only while no event is active", () => {
    const initial = createInitialState(1_000);
    const eventCollaborators = [collaborator(1, "events"), collaborator(2, "events")];
    const configured: GameState = {
      ...initial,
      collaborators: eventCollaborators,
      upgrades: { ...initial.upgrades, "collaborator-shifts": 5 },
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        fallbackAssignments: { events: "writing" },
      },
    };
    expect(getCollaboratorFallbackProductivity(configured, "writing")).toBeGreaterThan(0);

    const runningEvent = {
      id: "active-event",
      definitionId: "park-sparring" as const,
      title: "Sparring",
      location: "Parco",
      startedAt: 1_000,
      resolvesAt: 5_000,
      cost: 0,
      peopleMet: 0,
      demonstrationsGiven: 0,
      contactReward: 0,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      collaboratorId: eventCollaborators[0].id,
      status: "running" as const,
    };
    expect(getCollaboratorFallbackProductivity({
      ...configured,
      acquisitionEvents: [runningEvent],
    }, "writing")).toBe(0);
  });

  it("lets the chosen operational priority spend scarce euros first", () => {
    const initial = createInitialState(1_000, "", false);
    const student = {
      ...initial.contacts[0],
      status: "enrolled" as const,
      forms: [],
    };
    const instructor = {
      ...collaborator(1, "instructor"),
      forms: ["form-1"] as Collaborator["forms"],
      instructorForms: ["form-1"] as Collaborator["instructorForms"],
    };
    const equipmentCollaborator = collaborator(2, "equipment");
    const commonState: GameState = {
      ...initial,
      school: { ...initial.school, euros: 37.5 },
      contacts: [student],
      collaborators: [instructor, equipmentCollaborator],
      unlocks: { ...initial.unlocks, forms: true, collaborators: true },
      equipment: { ...initial.equipment, wear: 1 },
      automation: {
        ...initial.automation,
        lastProcessedAt: 1_000,
        equipmentBuffer: 1,
      },
      upgrades: { ...initial.upgrades, "operational-priorities": 1 },
    };

    const equipmentFirst = gameReducer(commonState, { type: "TICK", now: 2_500 });
    expect(equipmentFirst.equipment.wear).toBe(0);
    expect(equipmentFirst.school.euros).toBe(36);
    expect(equipmentFirst.contacts[0].training).toBeUndefined();

    const instructorFirst = gameReducer({
      ...commonState,
      collaboratorManagement: {
        ...commonState.collaboratorManagement,
        operationalPriorities: ["writing", "events", "instructor", "equipment", "gadget"],
      },
    }, { type: "TICK", now: 2_500 });
    expect(instructorFirst.contacts[0].training?.status).toBe("running");
    expect(instructorFirst.school.euros).toBe(0);
    expect(instructorFirst.equipment.wear).toBe(1);
  });
});
