import { describe, expect, it } from "vitest";
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

    expect(migrated.version).toBe(43);
    expect(migrated.upgrades["extra-form"]).toBe(0);
    expect(migrated.upgrades["technical-arena"]).toBe(0);
    expect(migrated.automation.agonistCoursesEnabled).toBe(false);
    expect(migrated.automation.lessonBuffer).toBe(0);
    expect(migrated.statistics.socialTrials).toBe(0);
    expect(migrated.contacts[0].lastFormTrainingYear).toBe(2);
    expect(migrated.contacts[0].formTrainingYearCount).toBe(1);
  });

  it("adds collaborator progress fields to version 39 saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 39;
    delete legacy.automation.lessonBuffer;
    delete legacy.automation.lastImprovedAthlete;
    delete legacy.statistics.socialTrials;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(43);
    expect(migrated.automation.lessonBuffer).toBe(0);
    expect(migrated.automation.lastImprovedAthlete).toBeUndefined();
    expect(migrated.statistics.socialTrials).toBe(0);
  });

  it("moves the first legacy Tiamat level to Istruttore Promisquo", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 40;
    legacy.upgrades["tiamat-instructor"] = 5;
    delete legacy.upgrades["promiscuous-instructor"];
    delete legacy.upgrades.pagosport;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(43);
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

    expect(migrated.version).toBe(43);
    expect(migrated.upgrades["divine-touch"]).toBe(0);
  });

  it("adds an empty Follower total to version 42 saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 42;
    delete legacy.school.followers;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(43);
    expect(migrated.school.followers).toBe(0);
  });
});
