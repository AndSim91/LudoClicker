import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import {
  getInstructorAthleticPreparationProductivity,
} from "../content/forms";
import { createInitialState } from "./initialState";
import { gameReducer } from "./engine";
import { improveRandomAthletes } from "./collaboratorAutomationOutcomes";
import type { Collaborator, GameState } from "./types";

function instructor(
  id: string,
  instructorForms: Collaborator["instructorForms"] = [],
): Collaborator {
  return {
    id,
    contactId: `contact-${id}`,
    displayName: id,
    joinedAt: 1_000,
    forms: ["form-3-staff"],
    instructorForms,
    formBranchPreferences: ["Staffa"],
    assignment: "instructor",
    mastery: createInitialCollaboratorMastery(),
    rarity: "ultra-rare",
  };
}

function preparationState(upgradeLevel: number): GameState {
  const initial = createInitialState(1_000);
  return {
    ...initial,
    contacts: initial.contacts.map((contact, index) =>
      index === 0
        ? { ...contact, status: "enrolled", arenaBase: 10, styleBase: 10 }
        : contact
    ),
    school: {
      ...initial.school,
      activeMembers: 1,
    },
    collaborators: [instructor("idle")],
    automation: {
      ...initial.automation,
      lessonBuffer: 0.99,
    },
    upgrades: {
      ...initial.upgrades,
      "agonist-course-intensity": upgradeLevel,
    },
  };
}

describe("instructor athletic preparation", () => {
  it("is locked until its upgrade and then improves one random base stat", () => {
    const locked = gameReducer(preparationState(0), { type: "TICK", now: 2_000 });
    expect(locked.contacts[0].arenaBase).toBe(10);
    expect(locked.contacts[0].styleBase).toBe(10);

    const active = gameReducer(preparationState(5), { type: "TICK", now: 2_000 });
    expect((active.contacts[0].arenaBase ?? 0) + (active.contacts[0].styleBase ?? 0))
      .toBe(21);
    expect(active.collaborators[0].mastery?.instructor).toBe(1);
  });

  it("uses only instructors with no active teaching or personal training", () => {
    const state = preparationState(5);
    const busyStudent = {
      ...state.contacts[0],
      training: {
        formId: "form-1" as const,
        startedAt: 1_000,
        completesAt: 10_000,
        status: "running" as const,
        instructorId: "idle",
      },
    };
    const busy = gameReducer({
      ...state,
      contacts: [busyStudent, ...state.contacts.slice(1)],
    }, { type: "TICK", now: 2_000 });

    expect(busy.contacts[0].arenaBase).toBe(10);
    expect(busy.contacts[0].styleBase).toBe(10);
    expect(busy.collaborators[0].mastery?.instructor).toBe(1);
  });

  it.each([7, 8])(
    "pauses athletic preparation during summer month %i",
    (currentMonth) => {
      const state = preparationState(5);
      const paused = gameReducer({
        ...state,
        school: { ...state.school, currentMonth },
      }, { type: "TICK", now: 2_000 });

      expect(paused.contacts[0].arenaBase).toBe(10);
      expect(paused.contacts[0].styleBase).toBe(10);
      expect(paused.automation.lessonBuffer).toBe(0.99);
    },
  );

  it("applies Staffa bonuses only from certified instructor forms", () => {
    const knownOnly = instructor("known");
    const certified = instructor("certified", ["form-3-staff"]);

    expect(getInstructorAthleticPreparationProductivity(certified))
      .toBeGreaterThan(getInstructorAthleticPreparationProductivity(knownOnly));
  });

  it("keeps large preparation batches deterministic while reusing athlete pools", () => {
    const initial = preparationState(5);
    const contacts = Array.from({ length: 4 }, (_, index) => ({
      ...initial.contacts[0],
      id: `late-member-${index}`,
      firstName: "Late",
      lastName: `Member ${index}`,
      email: `late-${index}@example.invalid`,
      status: "enrolled" as const,
      favorite: index === 1,
      arenaBase: 50,
      styleBase: 50,
    }));
    const result = improveRandomAthletes({
      ...initial,
      contacts,
      randomSeed: 123_456_789,
      automation: {
        ...initial.automation,
        lastImprovedAthleteId: contacts[1].id,
      },
    }, 25);

    expect(result.improvements).toBe(25);
    expect(result.state.randomSeed).toBe(51_939_292);
    expect(result.state.automation.lastImprovedAthleteId).toBe("late-member-1");
    expect(result.state.contacts.map((contact) => [contact.arenaBase, contact.styleBase]))
      .toEqual([[52, 52], [54, 54], [55, 52], [52, 54]]);
  });

  it("can improve the same athlete repeatedly when it is the only eligible one", () => {
    const initial = preparationState(5);
    const onlyAthlete = {
      ...initial.contacts[0],
      id: "only-athlete",
      status: "enrolled" as const,
      arenaBase: 10,
      styleBase: 10,
    };
    const result = improveRandomAthletes({
      ...initial,
      contacts: [onlyAthlete],
      automation: {
        ...initial.automation,
        lastImprovedAthleteId: onlyAthlete.id,
      },
    }, 3);

    expect(result.improvements).toBe(3);
    expect(
      (result.state.contacts[0].arenaBase ?? 0) +
      (result.state.contacts[0].styleBase ?? 0),
    ).toBe(23);
  });
});
