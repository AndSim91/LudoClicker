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
    forms: [],
    instructorForms: [],
    formBranchPreferences: [],
    autoTeachingEnabled: true,
    assignment: "instructor",
    mastery: { writing: 0, events: 0, lessons: 0, social: 0, equipment: 0, instructor: 0 },
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
  it("certifies every newly learned Form at level two without the Instructor surcharge", () => {
    const state = stateWithInstructor(2);
    const started = gameReducer(state, {
      type: "START_FORM_TRAINING",
      personId: state.collaborators[0].id,
      formId: "form-1",
      now: 2_000,
    });

    expect(started.school.euros).toBe(975);
    const completed = gameReducer(started, {
      type: "TICK",
      now: started.collaborators[0].training!.completesAt,
    });
    expect(completed.collaborators[0].forms).toContain("form-1");
    expect(completed.collaborators[0].instructorForms).toContain("form-1");
  });

  it("makes Instructor training and the Corso Agonisti free at level three", () => {
    const state = stateWithInstructor(3);
    const started = gameReducer(state, {
      type: "START_FORM_TRAINING",
      personId: state.collaborators[0].id,
      formId: "form-1",
      now: 2_000,
    });

    expect(started.school.euros).toBe(1_000);
    expect(getAgonistCourseCost(state)).toBe(0);
  });
});
