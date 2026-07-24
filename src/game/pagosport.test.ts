import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import { gameReducer } from "./engine";
import { getAgonistCourseCost } from "./trainingFlow";
import type { Collaborator } from "./types";

function stateWithInstructor(pagosport: number) {
  const initial = createInitialState(1_000, "", false);
  const contact = { ...initial.contacts[0], status: "enrolled" as const };
  const collaborator: Collaborator = {
    id: "pagosport-instructor",
    contactId: contact.id,
    displayName: "Istruttore PagoSport",
    joinedAt: 1_000,
    forms: ["form-1"],
    instructorForms: ["form-1"],
    formBranchPreferences: [],
    assignment: "instructor",
    mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
    rarity: "ultra-rare",
  };
  return {
    ...initial,
    school: { ...initial.school, currentMonth: 9, activeMembers: 1, historicMembers: 15, euros: 1_000 },
    contacts: [contact, ...initial.contacts.slice(1)],
    collaborators: [collaborator],
    unlocks: { ...initial.unlocks, forms: true, collaborators: true },
    upgrades: { ...initial.upgrades, pagosport },
  };
}

describe("PagoSport", () => {
  it("speeds Technician courses by 50% at level two", () => {
    const state = stateWithInstructor(2);
    const julyState = {
      ...state,
      school: { ...state.school, currentMonth: 7 },
    };
    const started = gameReducer(julyState, {
      type: "BOOK_TECHNICIAN_COURSE",
      collaboratorId: state.collaborators[0].id,
      formId: "form-1",
      now: 2_000,
    });

    expect(started.school.euros).toBe(500);
    expect(started.collaborators[0].training).toMatchObject({
      trainingTrack: "technician",
      trainingBaseDurationMs: 100_000,
    });
    expect(started.collaborators[0].training?.completesAt).toBe(42_000);
  });

  it("keeps courses paid and speeds every course by 50% at level three", () => {
    const state = stateWithInstructor(3);
    const instructor = {
      ...state.collaborators[0],
      forms: [],
      instructorForms: [],
    };
    const started = gameReducer(state, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-1",
      now: 2_000,
    });

    const actuallyStarted = gameReducer({ ...state, collaborators: [instructor] }, {
      type: "START_FORM_TRAINING",
      personId: instructor.id,
      formId: "form-1",
      now: 2_000,
    });
    expect(started).toBe(state);
    expect(actuallyStarted.school.euros).toBe(825);
    expect(actuallyStarted.collaborators[0].training?.completesAt).toBe(15_333);
    expect(getAgonistCourseCost(state)).toBe(300);
  });
});
