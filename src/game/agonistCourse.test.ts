import { FORM_DEFINITIONS } from "../content/forms";
import { describe, expect, it } from "vitest";
import { getContactBaseStats } from "./athleteStats";
import { gameReducer } from "./engine";
import { createInitialState } from "./initialState";
import { getAgonistCourseCost, startAgonistCourse } from "./trainingFlow";
import type { Collaborator, Contact, GameState } from "./types";

const completedPath = FORM_DEFINITIONS.map((definition) => definition.id);

function arenaState(level: number): GameState {
  const initial = createInitialState(1_000);
  const student: Contact = {
    ...initial.contacts[0],
    status: "enrolled",
    acquiredAt: 900,
    enrolledMonth: 9,
    rarity: "common",
    forms: completedPath,
    agonistCourseCompletions: 0,
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
  };
}

describe("Corso Agonisti", () => {
  it("costs 1,000 euros manually and 250 euros with an Instructor", () => {
    const initial = arenaState(1);

    expect(getAgonistCourseCost(initial, false)).toBe(1_000);
    expect(getAgonistCourseCost(initial, true)).toBe(250);
  });

  it("is permanently available after buying the first Arena Tecnica level", () => {
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

    expect(unlocked.upgrades["technical-arena"]).toBe(1);
    expect(unlocked.automation).not.toHaveProperty("agonistCoursesEnabled");
  });

  it("costs 250 euros with an Instructor, lasts 15 seconds and grants no Form", () => {
    const initial = arenaState(1);
    const started = startAgonistCourse(
      initial,
      initial.contacts[0].id,
      initial.collaborators[0].id,
      2_000,
    );

    expect(started.school.euros).toBe(1_750);
    expect(started.contacts[0].training?.formId).toBe("agonist-course");
    expect(started.contacts[0].training?.completesAt).toBe(17_000);

    const completed = gameReducer(started, { type: "TICK", now: 17_000 });
    expect(completed.contacts[0].training).toBeUndefined();
    expect(completed.contacts[0].forms).toEqual(initial.contacts[0].forms);
    expect(completed.statistics.formsCompleted).toBe(0);
  });

  it("has a base duration of 10 seconds at level two and is free at level three", () => {
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

    expect(fast.contacts[0].training?.completesAt).toBe(12_000);
    expect(free.school.euros).toBe(2_000);
  });

  it("uses one annual slot and cannot repeat in the same year", () => {
    const initial = arenaState(1);
    const expandedPlan = {
      ...initial,
      upgrades: {
        ...initial.upgrades,
        "extra-form": 1,
        pagosport: 2,
      },
    };
    const started = startAgonistCourse(
      expandedPlan,
      expandedPlan.contacts[0].id,
      expandedPlan.collaborators[0].id,
      2_000,
    );
    const completed = gameReducer(started, { type: "TICK", now: 17_000 });
    const repeated = startAgonistCourse(
      completed,
      completed.contacts[0].id,
      completed.collaborators[0].id,
      18_000,
    );

    expect(started.contacts[0].lastFormTrainingYear).toBe(1);
    expect(started.contacts[0].formTrainingYearCount).toBe(1);
    expect(started.contacts[0].lastAgonistCourseYear).toBe(1);
    expect(repeated).toBe(completed);
  });

  it("adds one Arena and one Style without limiting future annual improvements", () => {
    const initial = arenaState(1);
    const initialStats = getContactBaseStats(initial.contacts[0]);
    const firstStarted = startAgonistCourse(
      initial,
      initial.contacts[0].id,
      initial.collaborators[0].id,
      2_000,
    );
    const firstCompleted = gameReducer(firstStarted, { type: "TICK", now: 17_000 });
    const nextYear = {
      ...firstCompleted,
      school: { ...firstCompleted.school, currentMonth: 21, euros: 2_000 },
    };
    const secondStarted = startAgonistCourse(
      nextYear,
      nextYear.contacts[0].id,
      nextYear.collaborators[0].id,
      18_000,
    );
    const secondCompleted = gameReducer(secondStarted, { type: "TICK", now: 33_000 });

    expect(getContactBaseStats(firstCompleted.contacts[0])).toEqual({
      arena: initialStats.arena + 1,
      style: initialStats.style + 1,
    });
    expect(firstCompleted.contacts[0].agonistCourseCompletions).toBe(1);
    expect(firstCompleted.collaborators[0].mastery?.instructor).toBe(10);
    expect(firstCompleted.messages.some(
      (message) => message.subject.startsWith("Eseguito Corso Agonisti |"),
    )).toBe(false);
    expect(getContactBaseStats(secondCompleted.contacts[0])).toEqual({
      arena: initialStats.arena + 2,
      style: initialStats.style + 2,
    });
    expect(secondCompleted.contacts[0].agonistCourseCompletions).toBe(2);
    expect(secondCompleted.messages.some(
      (message) => message.subject.startsWith("Eseguito Corso Agonisti |"),
    )).toBe(false);
  });

  it("can use an Instructor who is already in formation", () => {
    const initial = arenaState(1);
    const ready = {
      ...initial,
      collaborators: [{
        ...initial.collaborators[0],
        training: {
          formId: "form-1" as const,
          startedAt: 1_000,
          completesAt: 100_000,
        },
      }],
    };

    const started = startAgonistCourse(
      ready,
      ready.contacts[0].id,
      ready.collaborators[0].id,
      2_000,
    );

    expect(started.contacts[0].training?.formId).toBe("agonist-course");
    expect(started.collaborators[0].training?.instructorTrainingDurationMultiplier).toBe(3);
  });

  it("uses the Corso Agonisti when no qualified Instructor can teach the next Form", () => {
    const initial = arenaState(1);
    const withoutQualifiedInstructor = {
      ...initial,
      school: { ...initial.school, euros: 5_000 },
      contacts: [{ ...initial.contacts[0], forms: [] }],
    };

    const started = gameReducer(withoutQualifiedInstructor, { type: "TICK", now: 2_000 });

    expect(started.contacts[0].training?.formId).toBe("agonist-course");
  });

  it("prefers a normal Form when a qualified Instructor is available", () => {
    const initial = arenaState(1);
    const readyForFormOne = {
      ...initial,
      school: { ...initial.school, euros: 5_000 },
      contacts: [{ ...initial.contacts[0], forms: [] }],
      collaborators: [{
        ...initial.collaborators[0],
        forms: ["form-1" as const],
        instructorForms: ["form-1" as const],
      }],
    };

    const started = gameReducer(readyForFormOne, { type: "TICK", now: 2_000 });

    expect(started.contacts[0].training?.formId).toBe("form-1");
  });

  it("applies the official risk ordering to normal Forms and Corso Agonisti together", () => {
    const initial = arenaState(1);
    const highRisk = {
      ...initial.contacts[0],
      id: "high-risk",
      firstName: "Alto",
      lastName: "Rischio",
      rarity: "common" as const,
      forms: [],
      acquiredAt: 800,
      favorite: false,
    };
    const favoriteLowRisk = {
      ...initial.contacts[0],
      id: "favorite-low-risk",
      firstName: "Basso",
      lastName: "Rischio",
      rarity: "rare" as const,
      forms: ["form-1" as const, "course-x" as const],
      acquiredAt: 950,
      favorite: true,
    };
    const orderedState = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, euros: 5_000 },
      contacts: [favoriteLowRisk, highRisk],
      collaborators: [{
        ...initial.collaborators[0],
        forms: ["form-2" as const],
        instructorForms: ["form-2" as const],
      }],
    };

    const started = gameReducer(orderedState, { type: "TICK", now: 2_000 });

    expect(started.contacts.find((contact) => contact.id === "high-risk")?.training?.formId)
      .toBe("agonist-course");
    expect(started.contacts.find((contact) => contact.id === "favorite-low-risk")?.training)
      .toBeUndefined();
  });
});
