import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";
import type { GameState } from "../types";
import { migrateGadgetState } from "./gadgets";
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

    const migrated = migrate(legacy) as GameState;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.unlocks.gadget).toBe(false);
    expect(migrated.gadgets.products.keychain.unlocked).toBe(false);
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
    expect(migrated.gadgets.products.keychain.unlocked).toBe(true);
    expect(migrated.gadgets.products.wristband.unlocked).toBe(false);
    expect(migrated.gadgets.products.keychain.projectPurchased).toBe(false);
  });

  it("adds the new catalog families without losing the old five-product progress", () => {
    const initial = createInitialState(1_000, "Manager");
    const legacyProducts = Object.fromEntries(
      ["wristband", "mug", "underwear", "tshirt", "hoodie"].map((productId) => [
        productId,
        initial.gadgets.products[productId as keyof typeof initial.gadgets.products],
      ]),
    ) as GameState["gadgets"]["products"];
    legacyProducts.wristband = {
      ...legacyProducts.wristband,
      unlocked: true,
      projectPurchased: true,
    };
    legacyProducts.underwear = { ...legacyProducts.underwear, unlocked: true };
    legacyProducts.hoodie = { ...legacyProducts.hoodie, unlocked: true };
    const legacyTotals = {
      wristband: 120,
      mug: 80,
      underwear: 40,
      tshirt: 20,
      hoodie: 0,
    } as GameState["gadgets"]["monthlyRevenue"]["totals"];
    const legacy: MigratableState = {
      ...initial,
      version: 80,
      unlocks: { ...initial.unlocks, gadget: true },
      gadgets: {
        ...initial.gadgets,
        products: legacyProducts,
        monthlyRevenue: {
          ...initial.gadgets.monthlyRevenue,
          totals: legacyTotals,
        },
      },
    };

    const migrated = migrate(legacy) as GameState;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(isValidGameState(migrated)).toBe(true);
    expect(migrated.gadgets.products.wristband.projectPurchased).toBe(true);
    expect(migrated.gadgets.products.keychain.unlocked).toBe(true);
    expect(migrated.gadgets.products["sticker-set"].unlocked).toBe(true);
    expect(migrated.gadgets.products.cap.unlocked).toBe(true);
    expect(migrated.gadgets.products["sports-tshirt"].unlocked).toBe(true);
    expect(migrated.gadgets.products["custom-hilt"].unlocked).toBe(false);
    expect(migrated.gadgets.monthlyRevenue.totals).toMatchObject({
      wristband: 120,
      mug: 80,
      underwear: 40,
      tshirt: 20,
      hoodie: 0,
      keychain: 0,
      "sticker-set": 0,
      cap: 0,
      "sports-tshirt": 0,
      "custom-hilt": 0,
    });
  });
});
