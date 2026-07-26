import { describe, expect, it } from "vitest";
import { FORM_DEFINITIONS } from "../content/forms";
import { createInitialState } from "./initialState";
import { processAutomaticInstructorQualifications } from "./teacherTrainingFlow";
import type { Collaborator, FormId, GameState } from "./types";

const ALL_FORMS = FORM_DEFINITIONS.map((definition) => definition.id);

function qualificationCandidate(
  id: string,
  joinedAt: number,
): Collaborator {
  return {
    id,
    contactId: `external-${id}`,
    displayName: id,
    joinedAt,
    forms: [...ALL_FORMS],
    instructorForms: [],
    technicianForms: [],
    formBranchPreferences: [],
    assignment: "instructor",
    mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
    rarity: "legendary",
  };
}

describe("aggregated Instructor qualification demand", () => {
  it("keeps a 1,000-member qualification pass unchanged when no Technician is available", () => {
    const initial = createInitialState(1_000, "", false);
    const template = initial.contacts[0];
    const contacts = Array.from({ length: 1_000 }, (_, index) => ({
      ...template,
      id: `member-${index}`,
      email: `member-${index}@example.test`,
      acquiredAt: index,
      status: "enrolled" as const,
      forms: [] as FormId[],
      training: undefined,
      specialProfileId: undefined,
      secretLegendaryId: undefined,
    }));
    const collaborators = Array.from({ length: 70 }, (_, index) =>
      qualificationCandidate(`candidate-${index}`, index)
    );
    const state: GameState = {
      ...initial,
      contacts,
      collaborators,
      school: {
        ...initial.school,
        activeMembers: contacts.length,
        currentMonth: 9,
        euros: 1_000_000,
      },
      upgrades: { ...initial.upgrades, "project-x": 1 },
    };

    expect(processAutomaticInstructorQualifications(state, 2_000)).toBe(state);
  });
});
