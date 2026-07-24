import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import type { GameState } from "../types";

describe("Corso Agonisti save migration", () => {
  it("preserves legacy gains and initializes the new upgrade", () => {
    const current = createInitialState(1_000);
    const contact: typeof current.contacts[number] & {
      agonistCourseArenaBonus?: number;
      agonistCourseStyleBonus?: number;
    } = {
      ...current.contacts[0],
      status: "enrolled" as const,
      agonistCourseCompletions: 3,
      lastAgonistCourseYear: 2,
    };
    delete contact.agonistCourseArenaBonus;
    delete contact.agonistCourseStyleBonus;
    const legacy = {
      ...current,
      version: 47,
      contacts: [contact],
      collaborators: [{
        id: "legacy-collaborator",
        contactId: contact.id,
        displayName: "Collaboratore Storico",
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        formBranchPreferences: [],
        assignment: null,
        mastery: {
          writing: 0,
          events: 0,
          equipment: 0,
          instructor: 0,
        },
        rarity: "legendary" as const,
      }],
    };

    const migrated = migrate(legacy) as GameState;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades["agonist-course-intensity"]).toBe(0);
    expect(migrated.contacts[0]).toMatchObject({
      agonistCourseArenaBonus: 3,
      agonistCourseStyleBonus: 3,
    });
    expect(migrated.collaborators[0].lastAgonistCourseYear).toBe(2);
  });
});
