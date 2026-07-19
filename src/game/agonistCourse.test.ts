import { FORM_DEFINITIONS } from "../content/forms";
import { describe, expect, it } from "vitest";
import { gameReducer } from "./engine";
import { createInitialState } from "./initialState";
import { startAgonistCourse } from "./trainingFlow";
import type { Collaborator, Contact, GameState } from "./types";

function arenaState(level: number): GameState {
  const initial = createInitialState(1_000);
  const student: Contact = {
    ...initial.contacts[0],
    status: "enrolled",
    acquiredAt: 900,
    rarity: "common",
    forms: FORM_DEFINITIONS.map((definition) => definition.id),
  };
  const instructor: Collaborator = {
    id: "instructor-1",
    contactId: "instructor-contact",
    displayName: "Istruttore",
    joinedAt: 900,
    forms: [],
    instructorForms: [],
    assignment: "instructor",
    rarity: "ultra-rare",
  };
  return {
    ...initial,
    school: { ...initial.school, activeMembers: 1, euros: 2_000 },
    contacts: [student],
    collaborators: [instructor],
    unlocks: { ...initial.unlocks, forms: true },
    upgrades: { ...initial.upgrades, "technical-arena": level },
    automation: { ...initial.automation, agonistCoursesEnabled: true },
  };
}

describe("Corso Agonisti", () => {
  it("turns on with the first Arena Tecnica level but respects later manual disabling", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, historicMembers: 35, euros: 10_000 },
      upgrades: { ...initial.upgrades, "instructor-versatility": 2 },
    };
    const unlocked = gameReducer(funded, {
      type: "BUY_UPGRADE",
      upgradeId: "technical-arena",
      now: 2_000,
    });
    const disabled = gameReducer(unlocked, {
      type: "TOGGLE_AGONIST_COURSES",
      enabled: false,
      now: 2_100,
    });
    const upgraded = gameReducer(disabled, {
      type: "BUY_UPGRADE",
      upgradeId: "technical-arena",
      now: 2_200,
    });

    expect(unlocked.automation.agonistCoursesEnabled).toBe(true);
    expect(upgraded.upgrades["technical-arena"]).toBe(2);
    expect(upgraded.automation.agonistCoursesEnabled).toBe(false);
  });

  it("costs 1,250 euros, lasts 15 seconds and grants no Form", () => {
    const initial = arenaState(1);
    const started = startAgonistCourse(
      initial,
      initial.contacts[0].id,
      initial.collaborators[0].id,
      2_000,
    );

    expect(started.school.euros).toBe(750);
    expect(started.contacts[0].training?.formId).toBe("agonist-course");
    expect(started.contacts[0].training?.completesAt).toBe(17_000);

    const completed = gameReducer(started, { type: "TICK", now: 17_000 });
    expect(completed.contacts[0].training).toBeUndefined();
    expect(completed.contacts[0].forms).toEqual(initial.contacts[0].forms);
    expect(completed.statistics.formsCompleted).toBe(0);
  });

  it("lasts 5 seconds at level two and is free at level three", () => {
    const levelTwo = arenaState(2);
    const fast = startAgonistCourse(
      levelTwo,
      levelTwo.contacts[0].id,
      levelTwo.collaborators[0].id,
      2_000,
    );
    const levelThree = arenaState(3);
    const free = startAgonistCourse(
      levelThree,
      levelThree.contacts[0].id,
      levelThree.collaborators[0].id,
      2_000,
    );

    expect(fast.contacts[0].training?.completesAt).toBe(7_000);
    expect(free.school.euros).toBe(2_000);
  });

  it("does not start while a normal Form is still available", () => {
    const initial = arenaState(1);
    const withPathOpen = {
      ...initial,
      contacts: [{ ...initial.contacts[0], forms: [] }],
    };
    expect(startAgonistCourse(
      withPathOpen,
      withPathOpen.contacts[0].id,
      withPathOpen.collaborators[0].id,
      2_000,
    )).toBe(withPathOpen);
  });
});
