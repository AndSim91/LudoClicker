import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { getCollaboratorAssignmentCounts } from "./collaboratorManagement";
import { gameReducer } from "./engine";
import { createInitialState } from "./initialState";
import { isValidGameState } from "./saveValidation";
import type { Collaborator, CollaboratorAssignment, GameState } from "./types";

function collaborator(index: number, assignment: CollaboratorAssignment = null, writingMastery = 0): Collaborator {
  return {
    id: `collaborator-${index}`,
    contactId: `contact-${index}`,
    displayName: `Collaboratore ${index}`,
    joinedAt: 1_000 + index,
    forms: [],
    instructorForms: [],
    formBranchPreferences: [],
    assignment,
    mastery: { ...createInitialCollaboratorMastery(), writing: writingMastery },
    rarity: "ultra-rare",
  };
}

function withCollaborators(collaborators: Collaborator[]): GameState {
  return { ...createInitialState(1_000), collaborators };
}

describe("Assegnazione automatica (4.7)", () => {
  it("keeps the proportions the player left and only places free collaborators", () => {
    const state = withCollaborators([
      collaborator(1, "writing"),
      collaborator(2, "writing"),
      collaborator(3, "events"),
      collaborator(4),
      collaborator(5),
      collaborator(6),
    ]);
    const on = gameReducer(state, { type: "SET_AUTOMATIC_ASSIGNMENT", enabled: true });

    expect(on.collaboratorManagement.automaticShares).toMatchObject({ writing: 67, events: 33, equipment: 0, instructor: 0 });
    expect(on.collaborators.slice(0, 3).map((entry) => entry.assignment)).toEqual(["writing", "writing", "events"]);
    expect(getCollaboratorAssignmentCounts(on)).toMatchObject({ writing: 4, events: 2 });
    expect(isValidGameState(on)).toBe(true);
  });

  it("puts each newcomer where the share is furthest behind, picking the best suited", () => {
    const on = gameReducer(withCollaborators([collaborator(1, "events")]), {
      type: "SET_AUTOMATIC_ASSIGNMENT",
      enabled: true,
    });
    const writingHeavy = gameReducer(on, { type: "CHANGE_AUTOMATIC_SHARE", assignment: "writing", delta: 1 });
    expect(writingHeavy.collaboratorManagement.automaticShares).toMatchObject({ writing: 5, events: 100 });

    const balanced = [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce(
      (state) => gameReducer(state, { type: "CHANGE_AUTOMATIC_SHARE", assignment: "writing", delta: 1 }),
      writingHeavy,
    );
    expect(balanced.collaboratorManagement.automaticShares?.writing).toBe(50);
    const arrived = gameReducer(
      { ...balanced, collaborators: [...balanced.collaborators, collaborator(2), collaborator(3, null, 40)] },
      { type: "MARK_ALL_MESSAGES_READ" },
    );
    expect(arrived.collaborators.find((entry) => entry.id === "collaborator-3")?.assignment).toBe("writing");
    expect(getCollaboratorAssignmentCounts(arrived)).toMatchObject({ writing: 1, events: 2 });
  });

  it("locks the manual controls while on and hands them back when off", () => {
    const on = gameReducer(withCollaborators([collaborator(1, "writing")]), {
      type: "SET_AUTOMATIC_ASSIGNMENT",
      enabled: true,
    });
    const refused = gameReducer(on, { type: "ASSIGN_COLLABORATOR", collaboratorId: "collaborator-1", assignment: "events", now: 2_000 });
    expect(refused.collaborators[0].assignment).toBe("writing");

    const off = gameReducer(on, { type: "SET_AUTOMATIC_ASSIGNMENT", enabled: false });
    expect(off.collaboratorManagement.automaticShares).toBeUndefined();
    const moved = gameReducer(off, { type: "ASSIGN_COLLABORATOR", collaboratorId: "collaborator-1", assignment: "events", now: 2_000 });
    expect(moved.collaborators[0].assignment).toBe("events");
  });
});
