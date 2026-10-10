import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import type { GameState, TournamentResult } from "../../game/types";
import { getTournamentYearView } from "./schoolYearTournaments";

function result(level: TournamentResult["level"], season: number): TournamentResult {
  return {
    id: `${level}-${season}`,
    level,
    season,
    completedAt: 1,
    participants: [],
    matches: [],
    groupStandings: [],
    arenaRanking: [],
    styleRanking: [],
    arenaPodium: [],
    stylePodium: [],
    qualifiers: [],
    rewards: [],
    secretLegendaryDefeatedIds: [],
  };
}

function stateAt(currentMonth: number, results: TournamentResult[]): GameState {
  const initial = createInitialState(1_000, "Manager");
  return {
    ...initial,
    school: { ...initial.school, currentMonth },
    tournaments: { ...initial.tournaments, results },
  };
}

describe("school year tournaments", () => {
  it("lists the school year from November to June with the Champion's of the previous season", () => {
    // May of school year 3 (month 41): Scolastico and Accademico of season 3 played.
    const view = getTournamentYearView(stateAt(41, [result("school", 3), result("academy", 3)]));

    expect(view.schoolYear).toBe(3);
    expect(view.entries.map((entry) => `${entry.level}:${entry.status}`)).toEqual([
      "champions:out",
      "school:done",
      "academy:done",
      "national:out",
    ]);
    expect(view.previous).toBeUndefined();
  });

  it("shows only the previous school year while nothing has been played in the current one", () => {
    // October of school year 4 (month 46): the season 3 results belong to school year 3.
    const view = getTournamentYearView(stateAt(46, [result("school", 3), result("academy", 3), result("national", 3)]));

    expect(view.schoolYear).toBe(4);
    expect(view.entries.some((entry) => entry.status === "done")).toBe(false);
    expect(view.previous?.schoolYear).toBe(3);
    expect(view.previous?.entries.filter((entry) => entry.status === "done").map((entry) => entry.level))
      .toEqual(["school", "academy", "national"]);
  });

  it("counts the November Champion's Arena in the school year after its season", () => {
    // December of school year 4 (month 48): the Champion's of season 3 was played in November.
    const view = getTournamentYearView(stateAt(48, [result("national", 3), result("champions", 3)]));

    expect(view.schoolYear).toBe(4);
    expect(view.entries[0]).toMatchObject({ level: "champions", status: "done" });
    expect(view.previous).toBeUndefined();
  });
});
