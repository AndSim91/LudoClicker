import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { migrate } from "../saveMigrations";

describe("tournament save migration", () => {
  it("adds stable athlete stats and initializes the competitive season", () => {
    const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
    legacy.version = 36;
    delete legacy.tournaments;
    delete legacy.network.secretLegendaries;
    delete legacy.contacts[0].arenaBase;
    delete legacy.contacts[0].styleBase;
    delete legacy.contacts[0].tournamentExperience;
    delete legacy.historyArchive.contactsBySource.tournament;

    const migrated = migrate(legacy) as ReturnType<typeof createInitialState>;

    expect(migrated.version).toBe(38);
    expect(migrated.contacts[0].arenaBase).toBeGreaterThanOrEqual(1);
    expect(migrated.contacts[0].styleBase).toBeGreaterThanOrEqual(1);
    expect(migrated.contacts[0].tournamentExperience).toBe(0);
    expect(migrated.tournaments).toMatchObject({
      results: [],
      immuneContactIds: [],
      championsVictoryCurrentSchool: false,
    });
    expect(migrated.network.secretLegendaries["marco-palena"].status).toBe("external");
    expect(migrated.historyArchive.contactsBySource.tournament).toEqual({
      total: 0,
      enrolled: 0,
    });
  });

  it("produces the same migrated statistics for the same legacy contact", () => {
    const createLegacy = () => {
      const legacy = JSON.parse(JSON.stringify(createInitialState(1_000)));
      legacy.version = 36;
      delete legacy.contacts[0].arenaBase;
      delete legacy.contacts[0].styleBase;
      return legacy;
    };

    const first = migrate(createLegacy()) as ReturnType<typeof createInitialState>;
    const second = migrate(createLegacy()) as ReturnType<typeof createInitialState>;
    expect(first.contacts[0].arenaBase).toBe(second.contacts[0].arenaBase);
    expect(first.contacts[0].styleBase).toBe(second.contacts[0].styleBase);
  });
});
