import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";

describe("Social revamp save migration", () => {
  it("keeps the full historical migration chain valid", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 1;
    delete legacy.automation.socialContentBuffer;
    delete legacy.statistics.socialContentCycles;
    delete legacy.statistics.socialFollowersGained;

    const migrated = migrate(legacy);

    expect(isValidGameState(migrated)).toBe(true);
  });

  it("resets only legacy Social state and leaves every collaborator unassigned", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 50;
    legacy.school.activeMembers = 35;
    legacy.school.historicMembers = 123;
    legacy.school.followers = 999;
    legacy.unlocks.social = false;
    legacy.upgrades["updated-page"] = 4;
    delete legacy.upgrades["social-content-synthesis"];
    delete legacy.upgrades["social-editorial-plan"];
    delete legacy.upgrades["social-content-distribution"];
    delete legacy.upgrades["social-sponsorships"];
    legacy.automation.socialBuffer = 0.75;
    legacy.automation.socialContentBuffer = 2_000;
    legacy.statistics.socialTrials = 7;
    legacy.statistics.socialCampaigns = 8;
    legacy.statistics.socialContacts = 9;
    legacy.statistics.socialContentCycles = 10;
    legacy.statistics.socialFollowersGained = 11;
    legacy.collaborators = [{
      id: "legacy-social",
      contactId: legacy.contacts[0].id,
      displayName: "Collaboratore Social",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "social",
      mastery: {
        writing: 120,
        events: 20,
        lessons: 30,
        social: 400,
        equipment: 50,
        instructor: 60,
      },
      rarity: "rare",
    }];

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(51);
    expect(migrated.unlocks.social).toBe(true);
    expect(migrated.school.followers).toBe(123);
    expect(migrated.school.historicMembers).toBe(123);
    expect(migrated.collaborators[0].assignment).toBeNull();
    expect(migrated.collaborators[0].mastery).toEqual({
      writing: 120,
      events: 20,
      lessons: 30,
      equipment: 50,
      instructor: 60,
    });
    expect(migrated.upgrades).not.toHaveProperty("updated-page");
    expect(migrated.upgrades["social-content-synthesis"]).toBe(0);
    expect(migrated.upgrades["social-editorial-plan"]).toBe(0);
    expect(migrated.upgrades["social-content-distribution"]).toBe(0);
    expect(migrated.upgrades["social-sponsorships"]).toBe(0);
    expect(migrated.automation).not.toHaveProperty("socialBuffer");
    expect(migrated.automation.socialContentBuffer).toBe(0);
    expect(migrated.statistics).not.toHaveProperty("socialTrials");
    expect(migrated.statistics).not.toHaveProperty("socialCampaigns");
    expect(migrated.statistics.socialContacts).toBe(0);
    expect(migrated.statistics.socialContentCycles).toBe(0);
    expect(migrated.statistics.socialFollowersGained).toBe(0);
  });

  it("keeps Social locked and followers at zero below 35 active members", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 50;
    legacy.school.activeMembers = 34;
    legacy.school.historicMembers = 200;
    legacy.school.followers = 80;
    legacy.unlocks.social = true;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.unlocks.social).toBe(false);
    expect(migrated.school.followers).toBe(0);
  });
});
