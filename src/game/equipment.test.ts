import { describe, expect, it } from "vitest";

import { buyOfficialSword, getOfficialSwordPurchaseCost } from "./equipment";
import { createInitialState } from "./engine";

describe("official sword purchases", () => {
  it.each([
    { amount: 1, euros: 363 },
    { amount: 10, euros: 3_630 },
    { amount: 100, euros: 36_300 },
  ])("charges the exact inflated balance for x$amount", ({ amount, euros }) => {
    const initial = createInitialState(1_000);
    const inflated = {
      ...initial,
      school: { ...initial.school, euros },
      lightInflation: { ...initial.lightInflation, priceMultiplier: 1.1 },
    };

    expect(getOfficialSwordPurchaseCost(inflated, amount)).toBe(euros);

    const purchased = buyOfficialSword(inflated, amount);

    expect(purchased.equipment.totalSwords).toBe(initial.equipment.totalSwords + amount);
    expect(purchased.school.euros).toBe(0);
  });
});
