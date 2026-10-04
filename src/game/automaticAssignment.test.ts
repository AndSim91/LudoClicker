import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import {
  getAutomaticSectorCounts,
  getCollaboratorAssignmentCounts,
  getInstructorPendingReleaseIds,
} from "./collaboratorManagement";
import { gameReducer } from "./engine";
import { createInitialState } from "./initialState";
import { migrateAutomaticShareLevelsState } from "./saveMigrations/automaticShareLevels";
import type { MigratableState } from "./saveMigrations/types";
import { isValidGameState } from "./saveValidation";
import type { Collaborator, CollaboratorAssignment, FormId, GameState } from "./types";

function collaborator(
  index: number,
  assignment: CollaboratorAssignment = null,
  extra: Partial<Collaborator> = {},
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
    ...extra,
  };
}

function teacher(index: number, forms: FormId[]): Collaborator {
  return collaborator(index, "instructor", { forms, instructorForms: forms });
}

function withCollaborators(collaborators: Collaborator[]): GameState {
  return { ...createInitialState(1_000), collaborators };
}

function switchOn(state: GameState): GameState {
  return gameReducer(state, { type: "SET_AUTOMATIC_ASSIGNMENT", enabled: true });
}

function setLevel(state: GameState, assignment: "writing" | "events" | "equipment" | "instructor", level: number) {
  return gameReducer(state, { type: "CHANGE_AUTOMATIC_SHARE", assignment, level });
}

function sectorOf(state: GameState, index: number) {
  return state.collaborators.find((entry) => entry.id === `collaborator-${index}`)?.assignment;
}

describe("Assegnazione automatica (4.7)", () => {
  it("starts the bars from the team the player left and only places free collaborators", () => {
    const on = switchOn(withCollaborators([
      collaborator(1, "writing"),
      collaborator(2, "writing"),
      collaborator(3, "events"),
      collaborator(4),
      collaborator(5),
      collaborator(6),
    ]));

    expect(on.collaboratorManagement.automaticShares).toMatchObject({ writing: 100, events: 50, equipment: 0, instructor: 0 });
    expect(on.collaborators.slice(0, 3).map((entry) => entry.assignment)).toEqual(["writing", "writing", "events"]);
    expect(getCollaboratorAssignmentCounts(on)).toMatchObject({ writing: 4, events: 2 });
    expect(isValidGameState(on)).toBe(true);
  });

  it("moves the fewest people at once, choosing who yields relatively most there", () => {
    const on = switchOn(withCollaborators([
      collaborator(1, "writing"),
      collaborator(2, "writing", { mastery: { ...createInitialCollaboratorMastery(), events: 400 } }),
      collaborator(3, "writing"),
      collaborator(4, "writing"),
      collaborator(5, "events"),
      collaborator(6, "events"),
    ]));
    const moved = setLevel(on, "events", 5);

    expect(moved.collaboratorManagement.automaticShares).toMatchObject({ writing: 100, events: 100 });
    expect(getCollaboratorAssignmentCounts(moved)).toMatchObject({ writing: 3, events: 3 });
    expect(sectorOf(moved, 2)).toBe("events");
    expect(moved.collaborators.filter((entry, index) => entry.assignment !== on.collaborators[index].assignment)).toHaveLength(1);
  });

  it("brings an Istruttore with Forms from another sector and fills the gap behind them", () => {
    const on = switchOn(withCollaborators([
      collaborator(1, "writing"),
      collaborator(2, "writing"),
      collaborator(3, "writing"),
      collaborator(4, "equipment", { forms: ["form-1", "form-2"], instructorForms: ["form-1", "form-2"] }),
      collaborator(5, "equipment"),
      teacher(6, ["form-1"]),
    ]));
    const moved = setLevel(on, "instructor", 5);

    expect(getCollaboratorAssignmentCounts(moved)).toMatchObject({ writing: 2, equipment: 2, instructor: 2 });
    expect(sectorOf(moved, 4)).toBe("instructor");
    expect(sectorOf(moved, 6)).toBe("instructor");
    expect(moved.collaborators.filter((entry, index) => entry.assignment !== on.collaborators[index].assignment)).toHaveLength(2);
  });

  it("lets an Istruttore who is teaching finish the lessons before changing sector", () => {
    const student = collaborator(1, "writing", {
      training: { formId: "form-1", startedAt: 1_000, completesAt: 999_999, status: "running", instructorId: "collaborator-3" },
    });
    const on = switchOn(withCollaborators([
      student,
      collaborator(2, "writing"),
      teacher(3, ["form-1"]),
      teacher(4, ["form-1", "form-2"]),
    ]));
    const moved = setLevel(on, "instructor", 1);

    expect(sectorOf(moved, 3)).toBe("instructor");
    expect(moved.collaboratorManagement.automaticPendingMoves).toEqual({ "collaborator-3": "writing" });
    expect(getInstructorPendingReleaseIds(moved).has("collaborator-3")).toBe(true);
    expect(getAutomaticSectorCounts(moved)).toMatchObject({ writing: 3, instructor: 1 });
    expect(isValidGameState(moved)).toBe(true);

    const lessonsOver = gameReducer(
      { ...moved, collaborators: moved.collaborators.map((entry) => ({ ...entry, training: undefined })) },
      { type: "MARK_ALL_MESSAGES_READ" },
    );
    expect(sectorOf(lessonsOver, 3)).toBe("writing");
    expect(lessonsOver.collaboratorManagement.automaticPendingMoves).toBeUndefined();
  });

  it("places newcomers where the bars say, without moving anyone else", () => {
    const on = switchOn(withCollaborators([collaborator(1, "events"), collaborator(2, "writing")]));
    const arrived = gameReducer(
      {
        ...on,
        collaborators: [
          ...on.collaborators,
          collaborator(3),
          collaborator(4, null, { mastery: { ...createInitialCollaboratorMastery(), writing: 400 } }),
        ],
      },
      { type: "MARK_ALL_MESSAGES_READ" },
    );
    expect(sectorOf(arrived, 1)).toBe("events");
    expect(sectorOf(arrived, 2)).toBe("writing");
    expect(sectorOf(arrived, 3)).toBe("events");
    expect(sectorOf(arrived, 4)).toBe("writing");
  });

  it("locks the manual controls while on and hands them back when off", () => {
    const on = switchOn(withCollaborators([collaborator(1, "writing")]));
    const refused = gameReducer(on, { type: "ASSIGN_COLLABORATOR", collaboratorId: "collaborator-1", assignment: "events", now: 2_000 });
    expect(refused.collaborators[0].assignment).toBe("writing");

    const off = gameReducer(on, { type: "SET_AUTOMATIC_ASSIGNMENT", enabled: false });
    expect(off.collaboratorManagement.automaticShares).toBeUndefined();
    const moved = gameReducer(off, { type: "ASSIGN_COLLABORATOR", collaboratorId: "collaborator-1", assignment: "events", now: 2_000 });
    expect(moved.collaborators[0].assignment).toBe("events");
  });

  it("v89 turns the old weights into bars, keeping the proportions", () => {
    const old = {
      version: 88,
      collaboratorManagement: {
        ...createInitialState(1_000).collaboratorManagement,
        automaticShares: { writing: 30, events: 20, equipment: 20, instructor: 20, gadget: 10 },
      },
    } as unknown as MigratableState;
    const migrated = migrateAutomaticShareLevelsState(old);
    expect(migrated.version).toBe(89);
    expect(migrated.collaboratorManagement?.automaticShares).toEqual({
      writing: 100, events: 67, equipment: 67, instructor: 67, gadget: 33,
    });
  });
});
