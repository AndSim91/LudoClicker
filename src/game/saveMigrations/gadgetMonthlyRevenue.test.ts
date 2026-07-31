import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";
import type { GameState } from "../types";

describe("Gadget monthly-revenue migration", () => {
  it("starts the current month at zero without changing lifetime profit", () => {
    const initial = createInitialState(1_000, "Manager");
    const legacy = {
      ...initial,
      version: 78,
      school: { ...initial.school, currentMonth: 16 },
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...initial.gadgets.products.wristband,
            rarities: {
              ...initial.gadgets.products.wristband.rarities,
              common: {
                ...initial.gadgets.products.wristband.rarities.common,
                totalProfit: 4_200,
              },
            },
          },
        },
      },
    };
    delete (legacy.gadgets as Partial<typeof initial.gadgets>).monthlyRevenue;

    const migrated = migrate(legacy) as GameState;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(isValidGameState(migrated)).toBe(true);
    expect(migrated.gadgets.monthlyRevenue).toMatchObject({
      month: 16,
      totals: {
        wristband: 0,
        mug: 0,
        underwear: 0,
        tshirt: 0,
        hoodie: 0,
      },
    });
    expect(migrated.gadgets.products.wristband.rarities.common.totalProfit).toBe(4_200);
  });
});
