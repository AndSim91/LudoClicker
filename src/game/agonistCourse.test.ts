import { FORM_DEFINITIONS, getTrainingCourseTitle } from "../content/forms";
import { describe, expect, it } from "vitest";
import { getContactBaseStats } from "./athleteStats";
import { getAthleteImmunityStatus } from "./athleteImmunity";
import { gameReducer } from "./engine";
import { createInitialState } from "./initialState";
import { getAgonistCourseCost, startAgonistCourse } from "./trainingFlow";
import { nextRandom } from "./random";
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

describe("Arena Tecnica e Corso Agonisti", () => {
  it("applies the base cost associated with each Arena Tecnica level", () => {
    expect(getAgonistCourseCost(arenaState(1))).toBe(300);
    expect(getAgonistCourseCost(arenaState(2))).toBe(300);
    expect(getAgonistCourseCost(arenaState(3))).toBe(1_000);
    expect(getAgonistCourseCost(arenaState(4))).toBe(500);
  });

  it("is permanently available after buying the first Arena Tecnica level", () => {
    const initial = createInitialState(1_000);
    const funded = {
      ...initial,
      school: { ...initial.school, historicMembers: 0, euros: 1_000 },
    };

    const unlocked = gameReducer(funded, {
      type: "BUY_UPGRADE",
      upgradeId: "technical-arena",
      now: 2_000,
    });

    expect(unlocked.upgrades["technical-arena"]).toBe(1);
    expect(unlocked.automation).not.toHaveProperty("agonistCoursesEnabled");
  });

  it("uses Arena Tecnica to protect the athlete without improving statistics", () => {
    const initial = arenaState(1);
    const initialStats = getContactBaseStats(initial.contacts[0]);
    const started = startAgonistCourse(
      initial,
      initial.contacts[0].id,
      initial.collaborators[0].id,
      2_000,
    );

    expect(started.school.euros).toBe(1_700);
    expect(started.contacts[0].training?.formId).toBe("agonist-course");
    expect(started.contacts[0].training?.agonistCourseGrantsStats).toBe(false);
    expect(started.contacts[0].training?.completesAt).toBe(44_000);
    expect(getAthleteImmunityStatus(
      { currentMonth: started.school.currentMonth },
      started.contacts[0],
    ).annualRollout).toBe(true);

    const completed = gameReducer(started, { type: "TICK", now: 44_000 });
    expect(completed.contacts[0].training).toBeUndefined();
    expect(completed.contacts[0].forms).toEqual(initial.contacts[0].forms);
    expect(getContactBaseStats(completed.contacts[0])).toEqual(initialStats);
    expect(completed.contacts[0].agonistCourseCompletions).toBe(0);
    expect(completed.statistics.formsCompleted).toBe(0);
  });

  it("reduces Arena Tecnica to 30 seconds at level two and unlocks Corso Agonisti at level three", () => {
    const levelTwo = arenaState(2);
    const arena = startAgonistCourse(
      levelTwo,
      levelTwo.contacts[0].id,
      levelTwo.collaborators[0].id,
      2_000,
    );
    const levelThree = arenaState(3);
    const agonistCourse = startAgonistCourse(
      levelThree,
      levelThree.contacts[0].id,
      levelThree.collaborators[0].id,
      2_000,
    );

    expect(arena.contacts[0].training?.completesAt).toBe(32_000);
    expect(arena.contacts[0].training?.agonistCourseGrantsStats).toBe(false);
    expect(getTrainingCourseTitle(
      arena.contacts[0].training!.formId,
      2,
      arena.contacts[0].training?.agonistCourseGrantsStats,
    )).toBe("Arena Tecnica");
    expect(agonistCourse.contacts[0].training?.completesAt).toBe(32_000);
    expect(agonistCourse.contacts[0].training?.agonistCourseGrantsStats).toBe(true);
    expect(getTrainingCourseTitle(
      agonistCourse.contacts[0].training!.formId,
      3,
      agonistCourse.contacts[0].training?.agonistCourseGrantsStats,
    )).toBe("Corso Agonisti");
    expect(agonistCourse.school.euros).toBe(1_000);
  });

  it("uses every remaining annual slot and cannot repeat in the same year", () => {
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
    const completed = gameReducer(started, { type: "TICK", now: 44_000 });
    const repeated = startAgonistCourse(
      completed,
      completed.contacts[0].id,
      completed.collaborators[0].id,
      45_000,
    );

    expect(started.contacts[0].lastFormTrainingYear).toBe(1);
    expect(started.contacts[0].formTrainingYearCount).toBe(3);
    expect(started.contacts[0].lastAgonistCourseYear).toBe(1);
    expect(started.contacts[0].training?.agonistCourseSlotsConsumed).toBe(3);
    expect(repeated).toBe(completed);
  });

  it("consumes and multiplies every slot left after another formation", () => {
    const initial = arenaState(3);
    const initialStats = getContactBaseStats(initial.contacts[0]);
    let doubleGainSeed = 0;
    while (true) {
      const [arenaRoll, afterArena] = nextRandom(doubleGainSeed);
      const [styleRoll] = nextRandom(afterArena);
      if (arenaRoll >= 0.5 && styleRoll >= 0.5) break;
      doubleGainSeed += 1;
    }
    const expandedPlan = {
      ...initial,
      randomSeed: doubleGainSeed,
      contacts: [{
        ...initial.contacts[0],
        lastFormTrainingYear: 1,
        formTrainingYearCount: 1,
      }],
      upgrades: {
        ...initial.upgrades,
        "extra-form": 1,
        pagosport: 1,
        "agonist-course-intensity": 1,
      },
    };

    const started = startAgonistCourse(
      expandedPlan,
      expandedPlan.contacts[0].id,
      expandedPlan.collaborators[0].id,
      2_000,
    );

    expect(started.contacts[0].training?.formId).toBe("agonist-course");
    expect(started.contacts[0].training?.agonistCourseSlotsConsumed).toBe(2);
    expect(started.contacts[0].formTrainingYearCount).toBe(3);

    const completed = gameReducer(started, { type: "TICK", now: 32_000 });
    expect(getContactBaseStats(completed.contacts[0])).toEqual({
      arena: initialStats.arena + 4,
      style: initialStats.style + 4,
    });
  });

  it("adds one Arena and one Style without limiting future annual improvements", () => {
    const initial = arenaState(3);
    const initialStats = getContactBaseStats(initial.contacts[0]);
    const firstStarted = startAgonistCourse(
      initial,
      initial.contacts[0].id,
      initial.collaborators[0].id,
      2_000,
    );
    const firstCompleted = gameReducer(firstStarted, { type: "TICK", now: 32_000 });
    const nextYear = {
      ...firstCompleted,
      school: { ...firstCompleted.school, currentMonth: 21, euros: 2_000 },
    };
    const secondStarted = startAgonistCourse(
      nextYear,
      nextYear.contacts[0].id,
      nextYear.collaborators[0].id,
      33_000,
    );
    const secondCompleted = gameReducer(secondStarted, { type: "TICK", now: 63_000 });

    expect(getContactBaseStats(firstCompleted.contacts[0])).toEqual({
      arena: initialStats.arena + 1,
      style: initialStats.style + 1,
    });
    expect(firstCompleted.contacts[0].agonistCourseCompletions).toBe(1);
    expect(firstCompleted.collaborators[0].mastery?.instructor).toBe(10);
    expect(firstCompleted.messages.some(
      (message) => message.subject.startsWith("Corso Agonisti |"),
    )).toBe(false);
    expect(getContactBaseStats(secondCompleted.contacts[0])).toEqual({
      arena: initialStats.arena + 2,
      style: initialStats.style + 2,
    });
    expect(secondCompleted.contacts[0].agonistCourseCompletions).toBe(2);
    expect(secondCompleted.contacts[0].agonistCourseArenaBonus).toBe(2);
    expect(secondCompleted.contacts[0].agonistCourseStyleBonus).toBe(2);
    expect(secondCompleted.messages.some(
      (message) => message.subject.startsWith("Corso Agonisti |"),
    )).toBe(false);
  });

  it("allows a collaborator without teachable Forms to complete the course", () => {
    const initial = arenaState(3);
    const collaboratorContact: Contact = {
      ...initial.contacts[0],
      id: "collaborator-contact",
      rarity: "legendary",
    };
    const student: Collaborator = {
      id: "collaborator-student",
      contactId: collaboratorContact.id,
      displayName: "Collaboratore Allievo",
      joinedAt: 900,
      forms: completedPath,
      instructorForms: [],
      formBranchPreferences: ["Spada Lunga"],
      assignment: null,
      rarity: "legendary",
    };
    const ready = {
      ...initial,
      contacts: [collaboratorContact],
      collaborators: [initial.collaborators[0], student],
    };

    const started = gameReducer(ready, { type: "TICK", now: 2_000 });
    expect(started.collaborators[1].training?.formId).toBe("agonist-course");
    expect(started.collaborators[1].lastAgonistCourseYear).toBe(1);

    const completed = gameReducer(started, { type: "TICK", now: 32_000 });
    expect(completed.collaborators[1].training).toBeUndefined();
    expect(completed.contacts[0].agonistCourseCompletions).toBe(1);
    expect(getContactBaseStats(completed.contacts[0])).toEqual({
      arena: getContactBaseStats(collaboratorContact).arena + 1,
      style: getContactBaseStats(collaboratorContact).style + 1,
    });
  });

  it("allows a fully trained Instructor collaborator to use the course", () => {
    const initial = arenaState(3);
    const instructorContact: Contact = {
      ...initial.contacts[0],
      id: "instructor-athlete-contact",
      rarity: "legendary",
    };
    const instructorStudent: Collaborator = {
      ...initial.collaborators[0],
      id: "instructor-athlete",
      contactId: instructorContact.id,
      forms: completedPath,
      instructorForms: completedPath,
      formBranchPreferences: ["Spada Lunga", "Staffa", "Doppia spada corta"],
      assignment: "instructor",
      rarity: "legendary",
    };
    const ready = {
      ...initial,
      contacts: [instructorContact],
      collaborators: [instructorStudent],
    };

    const started = gameReducer(ready, { type: "TICK", now: 2_000 });

    expect(started.collaborators[0].training).toMatchObject({
      formId: "agonist-course",
      instructorId: instructorStudent.id,
    });
  });

  it("uses deterministic random gains up to five with maximum intensity", () => {
    const initial = arenaState(3);
    const boosted = {
      ...initial,
      upgrades: { ...initial.upgrades, "agonist-course-intensity": 4 },
    };
    const [arenaRoll, afterArena] = nextRandom(boosted.randomSeed);
    const [styleRoll, expectedSeed] = nextRandom(afterArena);
    const initialStats = getContactBaseStats(boosted.contacts[0]);
    const started = startAgonistCourse(
      boosted,
      boosted.contacts[0].id,
      boosted.collaborators[0].id,
      2_000,
    );
    const completed = gameReducer(started, { type: "TICK", now: 32_000 });

    expect(getContactBaseStats(completed.contacts[0])).toEqual({
      arena: initialStats.arena + 1 + Math.floor(arenaRoll * 5),
      style: initialStats.style + 1 + Math.floor(styleRoll * 5),
    });
    expect(completed.randomSeed).toBe(expectedSeed);
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
