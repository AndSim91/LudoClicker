import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import {
  applyCollaboratorPreset,
  decrementCollaboratorAssignment,
  getCollaboratorAssignmentCounts,
  incrementCollaboratorAssignment,
  reconcileCollaboratorManagement,
  saveCollaboratorPreset,
} from "./collaboratorManagement";
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

const targets = {
  writing: 2,
  events: 1,
  equipment: 1,
  instructor: 2,
};

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

  it("applies a saved numeric preset and leaves excess collaborators unassigned", () => {
    const initial = createInitialState(1_000);
    const unlocked = reconcileCollaboratorManagement({
      ...initial,
      collaborators: Array.from({ length: 9 }, (_, index) => collaborator(index)),
    });
    const saved = saveCollaboratorPreset(unlocked, "preset-1", targets);
    const applied = applyCollaboratorPreset(saved, "preset-1");

    expect(applied.collaboratorManagement.activePresetId).toBe("preset-1");
    expect(getCollaboratorAssignmentCounts(applied)).toEqual(targets);
    expect(applied.collaborators.filter((candidate) => candidate.assignment === null)).toHaveLength(3);
  });

  it("keeps missing positions and fills them as soon as a collaborator becomes available", () => {
    const initial = createInitialState(1_000);
    const unlocked: GameState = {
      ...initial,
      collaborators: [collaborator(1), collaborator(2)],
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
      },
    };
    const saved = saveCollaboratorPreset(unlocked, "preset-1", {
      writing: 3,
      events: 0,
      equipment: 0,
      instructor: 0,
    });
    const applied = applyCollaboratorPreset(saved, "preset-1");

    expect(applied.collaborators.map((candidate) => candidate.assignment)).toEqual([
      "writing",
      "writing",
    ]);
    expect(applied.collaboratorManagement.presets["preset-1"].targets.writing).toBe(3);

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
      title: "Sparring al parco",
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
    const saved = saveCollaboratorPreset(unlocked, "preset-1", {
      writing: 1,
      events: 0,
      equipment: 0,
      instructor: 0,
    });
    const applied = applyCollaboratorPreset(saved, "preset-1");

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
        title: "Sparring al parco",
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
    const applied = applyCollaboratorPreset(
      saveCollaboratorPreset(unlocked, "preset-1", {
        writing: 1,
        events: 0,
        equipment: 0,
        instructor: 0,
      }),
      "preset-1",
    );

    const completed = gameReducer(applied, { type: "TICK", now: 5_000 });

    expect(completed.collaborators[0].assignment).toBe("writing");
    expect(completed.acquisitionEvents.filter((event) => event.status === "running")).toHaveLength(0);
  });

  it("marks direct sector changes as unsaved and uses only unassigned collaborators", () => {
    const initial = createInitialState(1_000);
    const unlocked = reconcileCollaboratorManagement({
      ...initial,
      collaborators: Array.from({ length: 9 }, (_, index) =>
        collaborator(index, index === 0 ? "events" : null)
      ),
    });

    const incremented = incrementCollaboratorAssignment(unlocked, "writing");

    expect(incremented.collaboratorManagement.hasUnsavedChanges).toBe(true);
    expect(incremented.collaboratorManagement.activePresetId).toBeNull();
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
});
