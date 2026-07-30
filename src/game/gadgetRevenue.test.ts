import { describe, expect, it } from "vitest";
import { createInitialState } from "./initialState";
import {
  recordGadgetMonthlyRevenue,
  resetGadgetMonthlyRevenueForMonth,
} from "./gadgetRevenue";
import { collectFees } from "./membershipFlow";

describe("Gadget monthly revenue", () => {
  it("records cumulative family revenue for the current month", () => {
    const initial = createInitialState(1_000);
    const wristband = initial.gadgets.products.wristband;
    const firstProducts = {
      ...initial.gadgets.products,
      wristband: {
        ...wristband,
        rarities: {
          ...wristband.rarities,
          common: { ...wristband.rarities.common, totalProfit: 40 },
        },
      },
    };
    const first = recordGadgetMonthlyRevenue(
      initial.gadgets,
      initial.gadgets.products,
      firstProducts,
      initial.school.currentMonth,
    );
    const secondProducts = {
      ...firstProducts,
      wristband: {
        ...firstProducts.wristband,
        rarities: {
          ...firstProducts.wristband.rarities,
          common: { ...firstProducts.wristband.rarities.common, totalProfit: 70 },
        },
      },
    };
    const second = recordGadgetMonthlyRevenue(
      first,
      firstProducts,
      secondProducts,
      initial.school.currentMonth,
    );

    expect(second.monthlyRevenue.totals.wristband).toBe(70);
  });

  it("starts a clean ranking at the monthly deadline", () => {
    const initial = createInitialState(1_000);
    const withRevenue = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        monthlyRevenue: {
          ...initial.gadgets.monthlyRevenue,
          totals: { ...initial.gadgets.monthlyRevenue.totals, mug: 500 },
        },
      },
    };

    const advanced = collectFees(withRevenue, initial.school.nextFeeAt, 1);

    expect(advanced.school.currentMonth).toBe(initial.school.currentMonth + 1);
    expect(advanced.gadgets.monthlyRevenue).toEqual(
      resetGadgetMonthlyRevenueForMonth(
        initial.gadgets,
        initial.school.currentMonth + 1,
      ).monthlyRevenue,
    );
  });
});
