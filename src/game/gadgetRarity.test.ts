import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import {
  canRollNextGadgetRarity,
  getGadgetFamilyUnitsSold,
  getGadgetRarityUpgradeChance,
  getHighestUnlockedGadgetRarity,
} from "./gadgetRarity";

describe("Gadget rarity rules", () => {
  it("adds one point per ten sales and 2.5 points per ten quality", () => {
    const initial = createInitialState(1_000, "Manager");
    const product = initial.gadgets.products.wristband;
    const progressed = {
      ...product,
      rarities: {
        ...product.rarities,
        common: {
          ...product.rarities.common,
          unlocked: true,
          quality: 93,
          unitsSold: 163,
        },
      },
    };

    expect(getGadgetRarityUpgradeChance(progressed, "common")).toBe(0.385);
    expect(getGadgetRarityUpgradeChance({
      ...progressed,
      rarities: {
        ...progressed.rarities,
        common: { ...progressed.rarities.common, unitsSold: 10_000 },
      },
    }, "common")).toBe(1);
  });

  it("uses the highest unlocked rarity and totals every variant in the family", () => {
    const initial = createInitialState(1_000, "Manager");
    const product = initial.gadgets.products.wristband;
    const progressed = {
      ...product,
      rarities: {
        ...product.rarities,
        common: { ...product.rarities.common, unlocked: true, unitsSold: 80 },
        rare: { ...product.rarities.rare, unlocked: true, unitsSold: 25 },
      },
    };

    expect(getHighestUnlockedGadgetRarity(progressed)).toBe("rare");
    expect(getGadgetFamilyUnitsSold(progressed)).toBe(105);
  });

  it("keeps Secret Legendary unavailable while its product-specific requirements are TBD", () => {
    const initial = createInitialState(1_000, "Manager");
    const product = initial.gadgets.products.wristband;
    const state = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...product,
            rarities: {
              ...product.rarities,
              legendary: { ...product.rarities.legendary, unlocked: true },
            },
          },
        },
      },
    };

    expect(canRollNextGadgetRarity(state, "wristband", "legendary")).toBe(false);
  });
});
