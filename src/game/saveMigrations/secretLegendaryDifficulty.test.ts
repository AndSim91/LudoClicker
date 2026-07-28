import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrateSecretLegendaryDifficultyState } from "./secretLegendaryDifficulty";

describe("Secret Legendary difficulty save migration", () => {
  it("boosts linked contacts and retained progress without changing Chronicles profiles", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 58;
    legacy.contacts[0] = {
      ...legacy.contacts[0],
      specialProfileId: "marco-palena",
      secretLegendaryId: "marco-palena",
      arenaBase: 75,
      styleBase: 90,
    };
    legacy.legendaryCollaborators.retainedProgress["pietro-scarica"] = {
      forms: ["form-1"],
      instructorForms: [],
      joinedAt: 1_000,
      arenaBase: 100,
      styleBase: 120,
    };
    legacy.legendaryCollaborators.retainedProgress["francesco-d-addosio"] = {
      forms: ["form-1"],
      instructorForms: [],
      joinedAt: 1_000,
      arenaBase: 1_200,
      styleBase: 1_200,
    };

    const migrated = migrateSecretLegendaryDifficultyState(legacy);

    expect(migrated.version).toBe(59);
    expect(migrated.contacts?.[0].arenaBase).toBeCloseTo(75 * (150 / 125));
    expect(migrated.contacts?.[0].styleBase).toBeCloseTo(90 * (150 / 125));
    expect(
      migrated.legendaryCollaborators?.retainedProgress["pietro-scarica"]?.arenaBase,
    ).toBeCloseTo(100 * (200 / 150));
    expect(
      migrated.legendaryCollaborators?.retainedProgress["pietro-scarica"]?.styleBase,
    ).toBeCloseTo(120 * (200 / 150));
    expect(
      migrated.legendaryCollaborators?.retainedProgress["francesco-d-addosio"]?.arenaBase,
    ).toBe(1_200);
  });
});
