import { describe, expect, it } from "vitest";
import { createInitialState } from "../engine";
import { migrateLateTutorialsState } from "./lateTutorials";
import type { MigratableState } from "./types";

function v101(change: (state: MigratableState) => MigratableState = (state) => state): MigratableState {
  return change({ ...(createInitialState(1_000) as unknown as MigratableState), version: 101 });
}

describe("late tutorials migration (v102)", () => {
  it("leaves a young save free to see every new tutorial", () => {
    const migrated = migrateLateTutorialsState(v101());
    expect(migrated.version).toBe(102);
    expect(migrated.tutorial?.completedSceneIds).toEqual([]);
    expect(migrated.moments?.seen).not.toContain("chronicles-key");
  });

  it("marks done what an older save already went past, and the first key as seen", () => {
    const migrated = migrateLateTutorialsState(v101((state) => ({
      ...state,
      tournaments: {
        ...state.tournaments!,
        results: [{} as never],
        nationalTitlesCurrentSchool: 1,
        reptile: { ...state.tournaments!.reptile, unlocked: true },
        chronicles: { unlocked: true, keys: 1 },
      },
    })));
    expect(migrated.tutorial?.completedSceneIds).toEqual([
      "first-tournament",
      "network-introduction",
      "reptile-introduction",
    ]);
    expect(migrated.moments?.seen).toContain("chronicles-key");
  });

  it("treats a save that founded a school as past the tournament, Network and Reptile tutorials", () => {
    const migrated = migrateLateTutorialsState(v101((state) => ({
      ...state,
      network: { ...state.network, schoolCount: 1 },
    })));
    expect(migrated.tutorial?.completedSceneIds).toEqual([
      "first-tournament",
      "network-introduction",
      "reptile-introduction",
    ]);
  });
});
