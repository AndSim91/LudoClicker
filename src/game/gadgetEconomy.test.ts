import { describe, expect, it } from "vitest";
import {
  GADGET_DEFINITIONS,
  GADGET_PRODUCT_ORDER,
  getGadgetRevisionCost,
  getGadgetWorkRequirement,
} from "../content/gadgets";
import { createInitialState } from "./initialState";
import {
  getGadgetAudience,
  getGadgetBaseQualityConversion,
  getGadgetMonthlyAttemptCapacity,
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

  it("uses the approved catalog order and explicit maximum-quality profits", () => {
    expect(GADGET_PRODUCT_ORDER).toEqual([
      "keychain",
      "sticker-set",
      "wristband",
      "mug",
      "tshirt",
      "cap",
      "underwear",
      "sports-tshirt",
      "hoodie",
      "custom-hilt",
    ]);
    expect(GADGET_PRODUCT_ORDER.map((productId) =>
      getGadgetUnitProfit(productId, 100)
    )).toEqual([5, 10, 15, 20, 30, 35, 20, 35, 40, 100]);
    expect(getGadgetUnitProfit("hoodie", 75)).toBe(30);
    expect(GADGET_DEFINITIONS["custom-hilt"].premiumOnly).toBe(true);
  });

  it("adds 50% value per rarity while revision costs still grow by 25%", () => {
    expect([
      "common",
      "rare",
      "ultra-rare",
      "legendary",
      "secret-legendary",
    ].map((rarity) => getGadgetUnitProfit(
      "wristband",
      100,
      rarity as Parameters<typeof getGadgetUnitProfit>[2],
    ))).toEqual([15, 22.5, 30, 37.5, 45]);
    expect(getGadgetRevisionCost("wristband", "rare")).toBe(625);
    expect(getGadgetRevisionCost("wristband", "secret-legendary")).toBe(1_000);
    expect(getGadgetWorkRequirement("wristband", "revision", "legendary")).toBe(
      getGadgetWorkRequirement("wristband", "revision", "common") * 1.75,
    );
  });

  it("applies generic school automation to monthly sales capacity", () => {
    const initial = createInitialState(1_000, "Manager", false);
    const state = {
      ...initial,
      collaborators: [{
        id: "gadget-collaborator",
        contactId: initial.contacts[0].id,
        displayName: "Collaboratore Gadget",
        joinedAt: 1_000,
        forms: [],
        instructorForms: [],
        formBranchPreferences: [],
        assignment: "gadget" as const,
        rarity: "ultra-rare" as const,
      }],
    };
    const baseCapacity = getGadgetMonthlyAttemptCapacity(state);
    const automatedCapacity = getGadgetMonthlyAttemptCapacity({
      ...state,
      upgrades: {
        ...state.upgrades,
        "standard-procedures": 5,
        "multi-site-coordination": 5,
      },
    });

    expect(automatedCapacity).toBe(baseCapacity * 1.75);
  });
});
