import { describe, expect, it } from "vitest";
import { getAvailableForms } from "../content/forms";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { gameReducer } from "./engine";
import { createInitialState } from "./initialState";
import { getMonthlyMemberFees } from "./membershipEconomy";
import type { Collaborator, GameState } from "./types";

describe("Progetto X", () => {
  it("skips Corso X before the power-up and inserts it after the unlock", () => {
    const student = {
      forms: ["form-1" as const],
      rarity: "common" as const,
    };

    expect(getAvailableForms(
      student,
      undefined,
      undefined,
      undefined,
      undefined,
      false,
    ).map((definition) => definition.id)).toEqual(["form-2"]);
    expect(getAvailableForms(
      student,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    ).map((definition) => definition.id)).toEqual(["course-x"]);
  });

  it("makes Corso X the only available recovery for athletes beyond Forma 2", () => {
    const student = {
      forms: ["form-1" as const, "form-2" as const, "course-y" as const],
      rarity: "rare" as const,
    };

    expect(getAvailableForms(
      student,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    ).map((definition) => definition.id)).toEqual(["course-x"]);
  });

  it("automatically assigns the recovery when a qualified instructor is available", () => {
    const initial = createInitialState(1_000);
    const member = {
      ...initial.contacts[0],
      id: "member-recovery",
      status: "enrolled" as const,
      forms: ["form-1" as const, "form-2" as const],
      training: undefined,
    };
    const instructor: Collaborator = {
      id: "course-x-instructor",
      contactId: "external-course-x-instructor",
      displayName: "Istruttore X",
      joinedAt: 1_000,
      forms: ["course-x"],
      instructorForms: ["course-x"],
      formBranchPreferences: [],
      assignment: "instructor",
      mastery: createInitialCollaboratorMastery(),
      rarity: "ultra-rare",
    };
    const state: GameState = {
      ...initial,
      school: { ...initial.school, activeMembers: 1, euros: 1_000 },
      contacts: [member],
      collaborators: [instructor],
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: { ...initial.upgrades, "project-x": 1 },
    };

    const processed = gameReducer(state, { type: "TICK", now: 2_000 });

    expect(processed.contacts[0].training).toMatchObject({
      formId: "course-x",
      instructorId: instructor.id,
      trainingTrack: "athlete",
    });
    expect(processed.school.euros).toBe(925);
  });

  it("preserves hidden Corso X data without counting it before the unlock", () => {
    const initial = createInitialState(1_000);
    const state: GameState = {
      ...initial,
      school: { ...initial.school, activeMembers: 1 },
      contacts: [{
        ...initial.contacts[0],
        status: "enrolled",
        forms: ["form-1", "course-x", "form-2"],
      }],
    };

    const hiddenFees = getMonthlyMemberFees(state);
    const visibleFees = getMonthlyMemberFees({
      ...state,
      upgrades: { ...state.upgrades, "project-x": 1 },
    });

    expect(visibleFees - hiddenFees).toBe(5);
    expect(state.contacts[0].forms).toContain("course-x");
  });
});
