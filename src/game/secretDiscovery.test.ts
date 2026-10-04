import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { discoverCourseXFromSuperbaVictory, getReptileTournamentName } from "./reptileUnlock";
import { getReptileDifficultyMultiplier } from "./reptileSimulation";
import { buyUpgrade } from "./upgradeFlow";
import { migrate } from "./saveMigrations";
import type { GameState } from "./types";

describe("Torneo della Superba e Corso X", () => {
  it("reveals Corso X for 1 € only after a Superba victory", () => {
    const initial = createInitialState(1_000, "Tester");
    const state = { ...initial, school: { ...initial.school, euros: 10 } };
    expect(buyUpgrade(state, "project-x")).toBe(state);

    const discovered = discoverCourseXFromSuperbaVictory(state, 2_000);
    expect(discovered.secretUpgradeDiscoveries).toEqual(["project-x"]);
    expect(discovered.messages[0].subject).toBe("Percorso Segreto: Corso X");
    const bought = buyUpgrade(discovered, "project-x");
    expect(bought.upgrades["project-x"]).toBe(1);
    expect(bought.school.euros).toBe(9);
    expect(discoverCourseXFromSuperbaVictory(discovered, 3_000)).toBe(discovered);
  });

  it("renames the Open and toughens the field once it is the Superba", () => {
    const initial = createInitialState(1_000, "Tester");
    const superba = { ...initial, network: { ...initial.network, superbaTournament: true } };
    expect(getReptileTournamentName(initial)).toBe("Torneo Reptile");
    expect(getReptileTournamentName(superba)).toBe("Torneo della Superba");
    expect(getReptileDifficultyMultiplier(superba) / getReptileDifficultyMultiplier(initial)).toBeCloseTo(1.25);
  });

  it("turns Reptiles already at fame level 1 into the Superba when loading older saves", () => {
    const initial = createInitialState(1_000, "Tester");
    const withFame = (fameXp: number) => ({
      ...initial,
      version: 83,
      tournaments: { ...initial.tournaments, reptile: { ...initial.tournaments.reptile, fameXp } },
    });
    expect((migrate(withFame(500)) as GameState).network.superbaTournament).toBe(true);
    expect((migrate(withFame(499)) as GameState).network.superbaTournament).toBeUndefined();
  });
});
