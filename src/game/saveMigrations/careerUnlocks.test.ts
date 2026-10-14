import { describe, expect, it } from "vitest";
import { migrateCareerUnlocksState } from "./careerUnlocks";
import type { MigratableState } from "./types";

type Migrated = {
  version: number;
  unlocks: { social: boolean; gadget: boolean };
  school: { followers?: number };
  gadgets: { products: Record<string, { unlocked: boolean }> };
};

const save = (career: { followers?: number; nationalTitles?: number; gadgetsSold?: number }, mastery?: object) => ({
  version: 114,
  unlocks: { social: false, gadget: false },
  school: { fame: 300 },
  statistics: {
    socialFollowersGained: career.followers ?? 0,
    career: { nationalTitles: career.nationalTitles ?? 0, gadgetsSold: career.gadgetsSold ?? 0 },
  },
  network: mastery ? { gadgetMastery: mastery } : {},
  gadgets: { products: { keychain: { unlocked: false }, mug: { unlocked: false } } },
}) as unknown as MigratableState;

const migrate = (state: MigratableState) => migrateCareerUnlocksState(state) as unknown as Migrated;

describe("migrateCareerUnlocksState", () => {
  it("opens Social and Gadget already seen in an earlier school", () => {
    const migrated = migrate(save({ followers: 1_200, nationalTitles: 1 }));
    expect(migrated.version).toBe(115);
    expect(migrated.unlocks).toEqual({ social: true, gadget: true });
    expect(migrated.school.followers).toBe(0);
    expect(migrated.gadgets.products.keychain.unlocked).toBe(true);
    expect(migrated.gadgets.products.mug.unlocked).toBe(false);
  });

  it("reads the Gadget from gadgets sold or a Maestria too", () => {
    expect(migrate(save({ gadgetsSold: 3 })).unlocks.gadget).toBe(true);
    expect(migrate(save({}, { wristband: ["common"] })).unlocks.gadget).toBe(true);
  });

  it("leaves a career without them as it is", () => {
    const migrated = migrate(save({}));
    expect(migrated.version).toBe(115);
    expect(migrated.unlocks).toEqual({ social: false, gadget: false });
  });
});
