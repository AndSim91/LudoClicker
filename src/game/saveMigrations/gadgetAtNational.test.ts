import { describe, expect, it } from "vitest";
import { migrateGadgetAtNationalState } from "./gadgetAtNational";
import type { MigratableState } from "./types";

const save = (nationalTitlesCurrentSchool: number, gadget = false) => ({
  version: 112,
  unlocks: { gadget },
  tournaments: { nationalTitlesCurrentSchool },
  gadgets: { products: { keychain: { unlocked: false }, mug: { unlocked: false } } },
}) as unknown as MigratableState;

describe("migrateGadgetAtNationalState", () => {
  it("opens the Gadget for a school that already won the Nazionale", () => {
    const migrated = migrateGadgetAtNationalState(save(1)) as unknown as {
      version: number; unlocks: { gadget: boolean };
      gadgets: { products: Record<string, { unlocked: boolean }> };
    };
    expect(migrated.version).toBe(113);
    expect(migrated.unlocks.gadget).toBe(true);
    expect(migrated.gadgets.products.keychain.unlocked).toBe(true);
    expect(migrated.gadgets.products.mug.unlocked).toBe(false);
  });

  it("leaves the others as they are", () => {
    const migrated = migrateGadgetAtNationalState(save(0)) as unknown as { version: number; unlocks: { gadget: boolean } };
    expect(migrated.version).toBe(113);
    expect(migrated.unlocks.gadget).toBe(false);
  });
});
