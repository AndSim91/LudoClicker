import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";

describe("Form training save migration", () => {
  it("adds Extra Forma and preserves one used slot from legacy saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 37;
    delete legacy.upgrades["extra-form"];
    legacy.contacts[0].lastFormTrainingYear = 2;
    delete legacy.contacts[0].formTrainingYearCount;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades["extra-form"]).toBe(0);
    expect(migrated.upgrades["technical-arena"]).toBe(0);
    expect(migrated.automation).not.toHaveProperty("agonistCoursesEnabled");
    expect(migrated.automation.lessonBuffer).toBe(0);
    expect(migrated.statistics).not.toHaveProperty("socialTrials");
    expect(migrated.statistics.socialContentCycles).toBe(0);
    expect(migrated.contacts[0].lastFormTrainingYear).toBe(2);
    expect(migrated.contacts[0].formTrainingYearCount).toBe(1);
    expect(migrated.contacts[0].agonistCourseCompletions).toBe(0);
  });

  it("adds collaborator progress fields to version 39 saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 39;
    delete legacy.automation.lessonBuffer;
    delete legacy.automation.lastImprovedAthlete;
    delete legacy.statistics.socialTrials;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.automation.lessonBuffer).toBe(0);
    expect(migrated.automation.lastImprovedAthlete).toBeUndefined();
    expect(migrated.statistics).not.toHaveProperty("socialTrials");
    expect(migrated.statistics.socialContentCycles).toBe(0);
  });

  it("moves the first legacy Tiamat level to Istruttore Promisquo", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 40;
    legacy.upgrades["tiamat-instructor"] = 5;
    delete legacy.upgrades["promiscuous-instructor"];
    delete legacy.upgrades.pagosport;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades["promiscuous-instructor"]).toBe(1);
    expect(migrated.upgrades["tiamat-instructor"]).toBe(4);
    expect(migrated.upgrades.pagosport).toBe(0);
    expect(migrated.upgrades["divine-touch"]).toBe(0);
  });

  it("adds Tocco DiGilo to version 41 saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 41;
    delete legacy.upgrades["divine-touch"];

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades["divine-touch"]).toBe(0);
  });

  it("adds an empty Follower total to version 42 saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 42;
    delete legacy.school.followers;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.school.followers).toBe(0);
  });

  it("removes the legacy Corso Agonisti toggle from version 43 saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 43;
    legacy.automation.agonistCoursesEnabled = false;
    delete legacy.contacts[0].agonistCourseCompletions;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.automation).not.toHaveProperty("agonistCoursesEnabled");
    expect(migrated.contacts[0].agonistCourseCompletions).toBe(0);
  });

  it("applies PagoSport's retroactive certificates", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 44;
    legacy.upgrades.pagosport = 2;
    legacy.collaborators = [{
      id: "legacy-pagosport",
      contactId: legacy.contacts[0].id,
      displayName: "Legacy PagoSport",
      joinedAt: 1_000,
      forms: ["form-1", "course-x"],
      instructorForms: [],
      formBranchPreferences: [],
      autoTeachingEnabled: true,
      assignment: null,
      mastery: { writing: 0, events: 0, lessons: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare",
    }];

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.collaborators[0].instructorForms).toEqual(["form-1", "course-x"]);
  });
});
