import { describe, expect, it } from "vitest";
import { migrateRemoveTournamentHallState } from "./removeTournamentHall";
import type { MigratableState } from "./types";

const migrate = (tournaments: object) => migrateRemoveTournamentHallState({
  version: 110,
  school: { currentMonth: 30 },
  tournaments,
} as unknown as MigratableState) as unknown as { version: number; tournaments: Record<string, unknown> };

describe("migrateRemoveTournamentHallState", () => {
  it("toglie l'Albo d'oro e tiene il primo Scolastico se era l'unica traccia", () => {
    const next = migrate({ results: [], hall: [{ level: "school", season: 1, arenaWinner: "Ada" }] });
    expect(next.version).toBe(111);
    expect(next.tournaments).not.toHaveProperty("hall");
    expect(next.tournaments.firstSchoolTournamentMonth).toBe(30);
  });

  it("non tocca firstSchoolTournamentMonth se c'è già un risultato Scolastico", () => {
    const next = migrate({ results: [{ level: "school", season: 1 }], hall: [{ level: "school", season: 1 }] });
    expect(next.tournaments).not.toHaveProperty("hall");
    expect(next.tournaments).not.toHaveProperty("firstSchoolTournamentMonth");
  });
});
