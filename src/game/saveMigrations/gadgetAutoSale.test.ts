import { expect, it } from "vitest";
import { migrateGadgetAutoSaleState } from "./gadgetAutoSale";
import type { MigratableState } from "./types";

it("v118: a tested prototype waiting for «Metti in vendita» goes on sale", () => {
  const migrated = migrateGadgetAutoSaleState({
    version: 117,
    gadgets: {
      products: {
        wristband: { prototypeCompleted: true, accepted: false },
        mug: { prototypeCompleted: false, accepted: false },
      },
    },
  } as unknown as MigratableState);
  expect(migrated).toMatchObject({
    version: 118,
    gadgets: { products: { wristband: { accepted: true }, mug: { accepted: false } } },
  });
});
