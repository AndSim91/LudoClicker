import { describe, expect, it } from "vitest";
import { migrateLegendaryResetState } from "./legendaryReset";
import type { MigratableState } from "./types";

const earned = {
  forms: ["form-1", "form-2"], instructorForms: ["form-1"], joinedAt: 5,
  arenaBase: 90, styleBase: 80, agonistCourseCompletions: 2, tournamentExperience: 7,
};

const save = (schoolCount: number) => ({
  version: 96,
  network: { schoolCount },
  contacts: [{ specialProfileId: "eva-parodi" }],
  legendaryCollaborators: { retainedProgress: { "eva-parodi": earned, "marco-palena": earned } },
}) as unknown as MigratableState;

describe("v97 Leggendari da zero nella nuova scuola", () => {
  it("azzera chi viene da scuole passate e tiene chi è passato da questa", () => {
    const retained = migrateLegendaryResetState(save(2)).legendaryCollaborators?.retainedProgress;
    expect(retained?.["marco-palena"]).toEqual({
      forms: [], instructorForms: [], technicianForms: [], formBranchPreferences: [],
      joinedAt: 5, arenaBase: 90, styleBase: 80,
    });
    expect(retained?.["eva-parodi"]).toBe(earned);
  });

  it("non tocca chi non ha mai fondato", () => {
    const migrated = migrateLegendaryResetState(save(0));
    expect(migrated.version).toBe(98);
    expect(migrated.legendaryCollaborators?.retainedProgress["marco-palena"]).toBe(earned);
  });
});

describe("v98 Andrea Simonazzi", () => {
  it("si azzera anche nei salvataggi già a v97", () => {
    const state = { ...save(1), version: 97 } as MigratableState;
    state.legendaryCollaborators!.retainedProgress["andrea-simonazzi"] = earned as never;
    const migrated = migrateLegendaryResetState(state);
    expect(migrated.version).toBe(98);
    expect(migrated.legendaryCollaborators?.retainedProgress["andrea-simonazzi"]).toMatchObject({
      forms: [], instructorForms: [], arenaBase: 90, styleBase: 80,
    });
  });
});
