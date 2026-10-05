import { describe, expect, it } from "vitest";
import { migratePointUnlocksState } from "./pointUnlocks";
import type { MigratableState } from "./types";

const save = (automaticShares?: object) =>
  ({ version: 99, upgrades: { "qr-cards": 2 }, collaboratorManagement: { automaticShares } }) as unknown as MigratableState;

describe("v100 sblocco a punti", () => {
  it("dà Occhio del Maestro 1 a tutti ed e-Learning 1 a chi usava l'assegnazione automatica", () => {
    const manual = migratePointUnlocksState(save());
    expect(manual.version).toBe(100);
    expect(manual.upgrades).toMatchObject({ "qr-cards": 2, "talent-eye": 1 });
    expect(manual.upgrades?.["e-learning"]).toBeUndefined();
    expect(migratePointUnlocksState(save({ instructor: 50 })).upgrades?.["e-learning"]).toBe(1);
  });
});
