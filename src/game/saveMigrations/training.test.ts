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

    expect(migrated.version).toBe(39);
    expect(migrated.upgrades["extra-form"]).toBe(0);
    expect(migrated.upgrades["technical-arena"]).toBe(0);
    expect(migrated.automation.agonistCoursesEnabled).toBe(false);
    expect(migrated.contacts[0].lastFormTrainingYear).toBe(2);
    expect(migrated.contacts[0].formTrainingYearCount).toBe(1);
  });
});
