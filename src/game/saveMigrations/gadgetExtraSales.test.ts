import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";
import type { GameState } from "../types";

describe("Gadget extra-sales migration", () => {
  it("preserves totals and classifies only sales beyond the current audience as extra", () => {
    const initial = createInitialState(1_000, "Manager");
    const wristband = initial.gadgets.products.wristband;
    const legacy = {
      ...initial,
      version: 77,
      school: {
        ...initial.school,
        activeMembers: 1_000,
        peakActiveMembers: 1_000,
      },
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...wristband,
            rarities: {
              ...wristband.rarities,
              common: {
                ...wristband.rarities.common,
                unitsSold: 125,
                totalProfit: 2_500,
              },
              rare: {
                ...wristband.rarities.rare,
                unitsSold: 75,
                totalProfit: 2_250,
              },
            },
          },
        },
      },
    };
    delete (legacy.gadgets.products.wristband.rarities.common as Partial<
      typeof wristband.rarities.common
    >).extraUnitsSold;
    delete (legacy.gadgets.products.wristband.rarities.rare as Partial<
      typeof wristband.rarities.rare
    >).extraUnitsSold;

    const migrated = migrate(legacy) as GameState;

    expect(migrated.version).toBe(79);
    expect(isValidGameState(migrated)).toBe(true);
    expect(migrated.gadgets.products.wristband.rarities.common).toMatchObject({
      unitsSold: 125,
      extraUnitsSold: 25,
      totalProfit: 2_500,
    });
    expect(migrated.gadgets.products.wristband.rarities.rare).toMatchObject({
      unitsSold: 75,
      extraUnitsSold: 0,
      totalProfit: 2_250,
    });
  });
});
