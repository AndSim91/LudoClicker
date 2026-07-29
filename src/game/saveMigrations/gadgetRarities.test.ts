import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { isValidGameState } from "../saveValidation";
import type { GameState } from "../types";
import { migrateGadgetRarityState } from "./gadgetRarities";
import { migrateSecretLegendaryCircuitBoostRemovalState } from "./secretLegendaryCircuitBoostRemoval";
import { migrateSecretLegendaryBaseRebalanceState } from "./secretLegendaryBaseRebalance";
import { migrateUpgradeRevampState } from "./upgradeRevamp";
import { migrateReptileState } from "./reptile";
import { migrateFirstCollaboratorTutorialState } from "./firstCollaboratorTutorial";
import { migrateAthleticPreparationMergeState } from "./athleticPreparationMerge";
import { migrateAgonistCourseProgressionState } from "./agonistCourseProgression";
import type { MigratableState } from "./types";

describe("Gadget rarity save migration", () => {
  it("moves the existing product into Common without rolling upper rarities", () => {
    const initial = createInitialState(1_000, "Manager");
    const legacy = {
      ...initial,
      version: 67,
      gadgets: {
        products: {
          ...initial.gadgets.products,
          wristband: {
            unlocked: true,
            projectPurchased: true,
            prototypeCompleted: true,
            accepted: true,
            quality: 73,
            unitsSold: 184,
            totalProfit: 2_686.4,
            salesRemainder: 0.25,
          },
        },
        activeWork: {
          productId: "wristband",
          kind: "revision",
          completedWorkMs: 10,
        },
        crossSellRemainder: 0.4,
        crossSellCursor: 2,
      },
    } as unknown as MigratableState;

    const migrated = migrateAgonistCourseProgressionState(
      migrateAthleticPreparationMergeState(
        migrateFirstCollaboratorTutorialState(
          migrateReptileState(migrateUpgradeRevampState(
            migrateSecretLegendaryBaseRebalanceState(
              migrateSecretLegendaryCircuitBoostRemovalState(
                migrateGadgetRarityState(legacy),
              ),
            ),
          )),
        ),
      ),
    ) as GameState;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.gadgets.products.wristband.rarities.common).toMatchObject({
      unlocked: true,
      quality: 73,
      unitsSold: 184,
      totalProfit: 2_686.4,
      salesRemainder: 0.25,
    });
    expect(migrated.gadgets.products.wristband.rarities.rare.unlocked).toBe(false);
    expect(migrated.gadgets.products.wristband.rarities["secret-legendary"].unlocked)
      .toBe(false);
    expect(migrated.gadgets.activeWork).toMatchObject({ rarity: "common" });
    expect(migrated.gadgets.activeWork?.opportunityRarity).toBeUndefined();
    expect(isValidGameState(migrated)).toBe(true);
  });
});
