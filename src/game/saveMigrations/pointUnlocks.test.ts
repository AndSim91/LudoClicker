import { describe, expect, it } from "vitest";
import { migratePointUnlocksState } from "./pointUnlocks";
import { migrate } from "../saveMigrations";
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

describe("upgrade nuovi nei salvataggi già alla versione corrente", () => {
  it("parte da livello 0 invece che indefinito", () => {
    const loaded = migrate({ version: 100, upgrades: { "qr-cards": 2 } }) as MigratableState;
    expect(loaded.upgrades).toMatchObject({ "qr-cards": 2, "event-multiverse": 0 });
  });
});
