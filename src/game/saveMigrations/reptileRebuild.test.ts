import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import { createInitialState } from "../initialState";
import { migrateReptileRebuildState } from "./reptileRebuild";
import type { MigratableState } from "./types";

describe("migrazione v92, Reptile rifatto", () => {
  it("annulla la vecchia edizione e rimette i collaboratori ai loro incarichi", () => {
    const base = createInitialState(1_000, "Manager");
    const legacy = {
      ...structuredClone(base),
      version: 91,
      lastSavedAt: 61_000,
      collaborators: [{
        id: "carla",
        contactId: "contact-carla",
        displayName: "Carla",
        joinedAt: 0,
        forms: [],
        instructorForms: [],
        technicianForms: [],
        formBranchPreferences: [],
        assignment: "gadget",
        mastery: createInitialCollaboratorMastery(),
        rarity: "ultra-rare",
        training: { formId: "form-1", startedAt: 1_000, completesAt: 5_000, status: "running", equipmentUsed: 0, wearPerSword: 0 },
      }],
      tournaments: {
        ...base.tournaments,
        reptile: {
          unlocked: true,
          fameXp: 600,
          victories: 1,
          nextPreparationSchoolYear: 3,
          hall: [],
          latestRecap: { id: "old" },
          activeEdition: { status: "preparing", startedAt: 1_000, previousAssignments: { carla: "events" } },
        },
      },
    } as unknown as MigratableState;

    const migrated = migrateReptileRebuildState(legacy);
    expect(migrated.version).toBe(92);
    expect(migrated.tournaments?.reptile).toEqual({ unlocked: true, fameXp: 600, victories: 1, hall: [] });
    expect(migrated.collaborators?.[0].assignment).toBe("events");
    expect(migrated.collaborators?.[0].training?.completesAt).toBe(65_000);
  });
});
