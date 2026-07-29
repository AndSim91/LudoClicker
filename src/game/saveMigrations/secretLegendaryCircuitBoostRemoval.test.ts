import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { migrateSecretLegendaryCircuitBoostRemovalState } from "./secretLegendaryCircuitBoostRemoval";

describe("Secret Legendary circuit boost removal save migration", () => {
  it("restores manual bases without changing Chronicles profiles", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 68;
    legacy.contacts[0] = {
      ...legacy.contacts[0],
      specialProfileId: "marco-palena",
      secretLegendaryId: "marco-palena",
      arenaBase: 90,
      styleBase: 108,
    };
    legacy.contacts[1] = {
      ...legacy.contacts[1],
      specialProfileId: "pietro-scarica",
      secretLegendaryId: "pietro-scarica",
      arenaBase: 138,
      styleBase: 141,
    };
    legacy.legendaryCollaborators.retainedProgress["simone-pedrazzi"] = {
      forms: [],
      instructorForms: [],
      joinedAt: 1_000,
      arenaBase: 183,
      styleBase: 217.5,
    };
    legacy.legendaryCollaborators.retainedProgress["francesco-d-addosio"] = {
      forms: [],
      instructorForms: [],
      joinedAt: 1_000,
      arenaBase: 1_200,
      styleBase: 1_200,
    };

    const migrated = migrateSecretLegendaryCircuitBoostRemovalState(legacy);

    expect(migrated.version).toBe(69);
    expect(migrated.contacts?.[0]).toMatchObject({ arenaBase: 75, styleBase: 90 });
    expect(migrated.contacts?.[1]).toMatchObject({ arenaBase: 92, styleBase: 94 });
    expect(
      migrated.legendaryCollaborators?.retainedProgress["simone-pedrazzi"],
    ).toMatchObject({ arenaBase: 122, styleBase: 145 });
    expect(
      migrated.legendaryCollaborators?.retainedProgress["francesco-d-addosio"],
    ).toMatchObject({ arenaBase: 1_200, styleBase: 1_200 });
  });

  it("cancels both historical boosts exactly once for older saves", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 58;
    legacy.legendaryCollaborators.retainedProgress["pietro-scarica"] = {
      forms: [],
      instructorForms: [],
      joinedAt: 1_000,
      arenaBase: 100,
      styleBase: 120,
    };

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(72);
    expect(
      migrated.legendaryCollaborators.retainedProgress["pietro-scarica"]?.arenaBase,
    ).toBeCloseTo(220 / (1.5 * 1.3) + 8);
    expect(
      migrated.legendaryCollaborators.retainedProgress["pietro-scarica"]?.styleBase,
    ).toBeCloseTo(230 / (1.5 * 1.3) + 26);
  });
});
