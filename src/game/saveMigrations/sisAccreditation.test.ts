import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../config";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { isValidGameState } from "../saveValidation";

describe("SIS accreditation save migration", () => {
  it("grandfathers schools that already used SIS Technician training", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 57;
    delete legacy.upgrades["sis-accreditation"];
    legacy.legendaryCollaborators.retainedProgress["eva-parodi"] = {
      forms: ["form-1"],
      instructorForms: ["form-1"],
      technicianForms: ["form-1"],
      joinedAt: 1_000,
    };

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(GAME_CONFIG.version);
    expect(migrated.upgrades["sis-accreditation"]).toBe(1);
    expect(isValidGameState(migrated)).toBe(true);
  });

  it("keeps accreditation locked for schools that never used the SIS", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 57;
    delete legacy.upgrades["sis-accreditation"];

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.upgrades["sis-accreditation"]).toBe(0);
    expect(isValidGameState(migrated)).toBe(true);
  });
});
