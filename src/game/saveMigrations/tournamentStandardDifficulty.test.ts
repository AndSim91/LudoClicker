import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";
import { migrateTournamentStandardDifficultyState } from "./tournamentStandardDifficulty";

describe("tournament standard difficulty save migration", () => {
  it("raises National Secret Legendary progress and leaves unchanged circuits intact", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 66;
    legacy.contacts[0] = {
      ...legacy.contacts[0],
      specialProfileId: "pietro-scarica",
      secretLegendaryId: "pietro-scarica",
      arenaBase: 120,
      styleBase: 150,
    };
    legacy.contacts[1] = {
      ...legacy.contacts[1],
      specialProfileId: "marco-palena",
      secretLegendaryId: "marco-palena",
      arenaBase: 90,
      styleBase: 108,
    };
    legacy.legendaryCollaborators.retainedProgress["simone-pedrazzi"] = {
      forms: ["form-1"],
      instructorForms: [],
      joinedAt: 1_000,
      arenaBase: 160,
      styleBase: 200,
    };
    legacy.legendaryCollaborators.retainedProgress["francesco-d-addosio"] = {
      forms: ["form-1"],
      instructorForms: [],
      joinedAt: 1_000,
      arenaBase: 1_200,
      styleBase: 1_200,
    };

    const migrated = migrateTournamentStandardDifficultyState(legacy);

    expect(migrated.version).toBe(67);
    expect(migrated.contacts?.[0]).toMatchObject({ arenaBase: 135, styleBase: 168.75 });
    expect(migrated.contacts?.[1]).toMatchObject({ arenaBase: 90, styleBase: 108 });
    expect(
      migrated.legendaryCollaborators?.retainedProgress["simone-pedrazzi"],
    ).toMatchObject({ arenaBase: 180, styleBase: 225 });
    expect(
      migrated.legendaryCollaborators?.retainedProgress["francesco-d-addosio"],
    ).toMatchObject({ arenaBase: 1_200, styleBase: 1_200 });
  });

  it("applies both recalibrations exactly once to older saves", () => {
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

    expect(migrated.version).toBe(67);
    expect(
      migrated.legendaryCollaborators.retainedProgress["pietro-scarica"]?.arenaBase,
    ).toBeCloseTo(150);
    expect(
      migrated.legendaryCollaborators.retainedProgress["pietro-scarica"]?.styleBase,
    ).toBeCloseTo(180);
  });
});
