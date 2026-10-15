import { expect, it } from "vitest";
import { migrateLightInflationFoundationState } from "./lightInflationFoundation";
import type { MigratableState } from "./types";

const inflation = { priceMultiplier: 1, increases: 0, purchasedSwords: 2, swordsBeforePurchases: 6, eurosEarnedAtCheck: 0 };

it("v117: a founded school measures from the start of its school year, not from 0", () => {
  const founded = {
    version: 116,
    network: { schoolCount: 1 },
    lightInflation: inflation,
    annual: { ledger: { start: { eurosEarned: 80_000 } } },
  } as unknown as MigratableState;
  expect(migrateLightInflationFoundationState(founded)).toMatchObject({
    version: 117,
    lightInflation: { eurosEarnedAtCheck: 80_000 },
  });

  const first = { ...founded, network: { schoolCount: 0 } } as unknown as MigratableState;
  expect(migrateLightInflationFoundationState(first).lightInflation).toEqual(inflation);
});
