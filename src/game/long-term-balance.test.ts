import { beforeAll, describe, expect, it } from "vitest";
import { getPrestigeRequirements, canFoundSchool, createInitialState, gameReducer } from "./engine";
import {
  percentile,
  simulateBalanceBatch,
  type BalanceSimulationResult,
} from "./balanceSimulation";

const GAME_COUNT = 2;
const INTENSE_HORIZON_MS = 2 * 60 * 60_000;
const RELAXED_HORIZON_MS = 2 * 60 * 60_000;
// First prestige (first National title): 60–90 minutes of active play.
const MINIMUM_MS = 60 * 60_000;
const INTENSE_MAXIMUM_MS = 90 * 60_000;

function seeds(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

function reachedTimes(results: BalanceSimulationResult[]): number[] {
  return results
    .filter((result) => result.reachedPrestige && result.prestigeReadyAtMs !== undefined)
    .map((result) => result.prestigeReadyAtMs!);
}

describe("long-term automated balance simulation", () => {
  let intense: BalanceSimulationResult[];
  let relaxed: BalanceSimulationResult[];

  beforeAll(async () => {
    [intense, relaxed] = await Promise.all([
      simulateBalanceBatch(seeds(GAME_COUNT), "intense", INTENSE_HORIZON_MS),
      simulateBalanceBatch(seeds(GAME_COUNT), "relaxed", RELAXED_HORIZON_MS),
    ]);
  }, 120_000);

  it("runs X intense and relaxed games independently in virtual time", () => {
    expect(intense).toHaveLength(GAME_COUNT);
    expect(relaxed).toHaveLength(GAME_COUNT);
    expect(new Set(intense.map((result) => result.state.createdAt)).size).toBe(GAME_COUNT);
    expect(new Set(relaxed.map((result) => result.state.createdAt)).size).toBe(GAME_COUNT);
    expect(intense.every((result) => result.state.school.fame > 0)).toBe(true);
    expect(relaxed.every((result) => result.state.school.fame > 0)).toBe(true);
  });

  it("opens the first prestige within the intended session targets", () => {
    const intenseTimes = reachedTimes(intense);
    const relaxedTimes = reachedTimes(relaxed);

    expect(intenseTimes, "ogni partita intensa arriva al primo Nazionale").toHaveLength(GAME_COUNT);
    expect.soft(percentile(intenseTimes, 0.1), "P10 del primo prestigio: almeno 60 minuti")
      .toBeGreaterThanOrEqual(MINIMUM_MS);
    expect.soft(percentile(intenseTimes, 0.5), "mediana del primo prestigio intenso: entro 90 minuti")
      .toBeLessThanOrEqual(INTENSE_MAXIMUM_MS);
    if (relaxedTimes.length > 0) {
      expect.soft(percentile(relaxedTimes, 0.1), "P10 del primo prestigio tranquillo: almeno 60 minuti")
        .toBeGreaterThanOrEqual(MINIMUM_MS);
    }
  });

  it("opens the prestige with one national title in Arena or Style, and offers it once", () => {
    const startedAt = 1_700_000_000_000;
    const state = createInitialState(startedAt, "Prestige gate test");
    expect(getPrestigeRequirements(state)).toEqual({ nationalTitles: 1, currentNationalTitles: 0 });
    expect(canFoundSchool({
      ...state,
      tournaments: { ...state.tournaments, championsVictoryCurrentSchool: true },
    })).toBe(false);

    const titled = {
      ...state,
      tournaments: { ...state.tournaments, nationalTitlesCurrentSchool: 1 },
    };
    const ready = gameReducer(titled, { type: "TICK", now: startedAt + 1_000 });
    expect(canFoundSchool(ready)).toBe(true);
    expect(ready.network.prestigeOfferSent).toBe(true);
    expect(ready.messages.filter((message) => message.subject === "Campioni d'Italia")).toHaveLength(1);
  });
});
