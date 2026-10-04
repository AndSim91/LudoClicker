import { describe, expect, it } from "vitest";
import { migrateSuperbaLevelOneState } from "./superbaLevelOne";
import type { MigratableState } from "./types";

const save = (fameXp: number) =>
  ({ version: 95, network: {}, tournaments: { reptile: { fameXp } } }) as unknown as MigratableState;

describe("v96 Superba al livello 1", () => {
  it("rende Superba chi ha già il livello 1 di fama", () => {
    expect(migrateSuperbaLevelOneState(save(500)).network?.superbaTournament).toBe(true);
    expect(migrateSuperbaLevelOneState(save(499)).network?.superbaTournament).toBeUndefined();
    expect(migrateSuperbaLevelOneState(save(499)).version).toBe(96);
  });
});
