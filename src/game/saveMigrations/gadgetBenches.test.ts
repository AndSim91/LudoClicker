import { describe, expect, it } from "vitest";
import { migrateGadgetBenchesState } from "./gadgetBenches";
import type { MigratableState } from "./types";

describe("v101 banchi del laboratorio", () => {
  it("trasforma il lavoro in corso nel primo banco", () => {
    const work = { productId: "mug", kind: "revision", rarity: "common", completedWorkMs: 5 };
    const migrated = migrateGadgetBenchesState({ version: 100, gadgets: { activeWork: work } } as unknown as MigratableState);
    expect(migrated.version).toBe(101);
    expect(migrated.gadgets).toEqual({ activeWorks: [work] });
    const idle = migrateGadgetBenchesState({ version: 100, gadgets: {} } as unknown as MigratableState);
    expect(idle.gadgets).toEqual({ activeWorks: [] });
  });
});
