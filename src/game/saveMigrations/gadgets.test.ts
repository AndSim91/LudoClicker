import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import { createInitialState } from "../initialState";
import { isValidGameState } from "../saveValidation";
import type { GameState } from "../types";
import { migrateGadgetState } from "./gadgets";
import { migrateTournamentStandardDifficultyState } from "./tournamentStandardDifficulty";
import type { MigratableState } from "./types";

describe("Gadget save migration", () => {
  it("adds a clean sector, upgrades and Gadget mastery to version 65 saves", () => {
    const initial = createInitialState(1_000, "Manager");
    const mastery = createInitialCollaboratorMastery();
    delete mastery.gadget;
    const legacy: MigratableState = {
      ...initial,
      version: 65,
      gadgets: undefined,
      collaborators: [{
        id: "collaborator",
        contactId: "contact",
        displayName: "Collaboratore",
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        formBranchPreferences: [],
        assignment: null,
        mastery,
        rarity: "ultra-rare",
      }],
      upgrades: Object.fromEntries(
        Object.entries(initial.upgrades).filter(([id]) => !id.startsWith("gadget-")),
      ),
    };

    const migrated = migrateTournamentStandardDifficultyState(
      migrateGadgetState(legacy),
    ) as GameState;

    expect(migrated.version).toBe(67);
    expect(migrated.unlocks.gadget).toBe(false);
    expect(migrated.gadgets.products.wristband.unlocked).toBe(false);
    expect(migrated.collaborators[0].mastery?.gadget).toBe(0);
    expect(migrated.collaboratorManagement.targets.gadget).toBe(0);
    expect(migrated.upgrades["gadget-showcase"]).toBe(0);
    expect(isValidGameState(migrated)).toBe(true);
  });

  it("honors an Academy Arena victory already stored in the save", () => {
    const initial = createInitialState(1_000, "Manager");
    const legacy: MigratableState = {
      ...initial,
      version: 65,
      gadgets: undefined,
      tournaments: {
        ...initial.tournaments,
        results: [{
          level: "academy",
          arenaRanking: ["winner"],
          participants: [{ id: "winner", ownedContactId: "member" }],
        } as GameState["tournaments"]["results"][number]],
      },
    };

    const migrated = migrateGadgetState(legacy) as GameState;

    expect(migrated.unlocks.gadget).toBe(true);
    expect(migrated.gadgets.products.wristband.unlocked).toBe(true);
    expect(migrated.gadgets.products.wristband.projectPurchased).toBe(false);
  });
});
