import { describe, expect, it } from "vitest";
import { GADGET_PRODUCT_ORDER } from "../content/gadgets";
import { createInitialState } from "./initialState";
import {
  getGadgetAudience,
  getGadgetBaseQualityConversion,
  getGadgetQualityConversion,
  getGadgetUnitProfit,
} from "./gadgetEconomy";

describe("Gadget economy", () => {
  it("grows audience coverage from 10% of members to all members and followers", () => {
    const initial = createInitialState(1_000, "Manager");
    const state = {
      ...initial,
      school: {
        ...initial.school,
        activeMembers: 2_000,
        peakActiveMembers: 2_000,
        followers: 50_000,
      },
    };

    expect(getGadgetAudience(state)).toBe(200);
    expect(getGadgetAudience({
      ...state,
      upgrades: {
        ...state.upgrades,
        "gadget-showcase": 5,
        "gadget-online-store": 9,
      },
    })).toBe(52_000);
  });

  it("uses the approved quality anchors and commercial bonus without selling at zero", () => {
    const initial = createInitialState(1_000, "Manager");

    expect([0, 25, 50, 75, 100].map(getGadgetBaseQualityConversion)).toEqual([
      0, 0.5, 0.75, 0.9, 1,
    ]);
    expect(getGadgetQualityConversion(25, {
      ...initial.upgrades,
      "gadget-sales-training": 5,
    })).toBeCloseTo(0.6);
    expect(getGadgetQualityConversion(0, {
      ...initial.upgrades,
      "gadget-sales-training": 5,
    })).toBe(0);
  });

  it("recovers every project cost in 500 sales at maximum quality", () => {
    expect(GADGET_PRODUCT_ORDER.map((productId) =>
      getGadgetUnitProfit(productId, 100)
    )).toEqual([20, 30, 40, 50, 80]);
    expect(getGadgetUnitProfit("hoodie", 75)).toBe(60);
  });
});
