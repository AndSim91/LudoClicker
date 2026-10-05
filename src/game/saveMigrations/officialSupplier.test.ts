import { describe, expect, it } from "vitest";
import { migrateOfficialSupplierState } from "./officialSupplier";
import type { MigratableState } from "./types";

const save = (peakActiveMembers: number, totalSwords: number) =>
  ({ version: 98, school: { peakActiveMembers }, equipment: { totalSwords }, upgrades: {} }) as unknown as MigratableState;

describe("v99 Fornitore ufficiale", () => {
  it("regala il nodo a chi aveva già aperto l'acquisto delle spade", () => {
    expect(migrateOfficialSupplierState(save(15, 6)).upgrades?.["official-supplier"]).toBe(1);
    expect(migrateOfficialSupplierState(save(3, 7)).upgrades?.["official-supplier"]).toBe(1);
    const closed = migrateOfficialSupplierState(save(14, 6));
    expect(closed.upgrades?.["official-supplier"]).toBeUndefined();
    expect(closed.version).toBe(99);
  });
});
