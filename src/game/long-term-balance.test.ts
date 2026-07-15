import { beforeAll, describe, expect, it } from "vitest";
import { getPrestigeRequirements, canFoundSchool, createInitialState, gameReducer } from "./engine";
import {
  percentile,
  simulateBalanceBatch,
  type BalanceSimulationResult,
} from "./balanceSimulation";

const GAME_COUNT = 2;
const INTENSE_HORIZON_MS = 2 * 60 * 60_000;
const RELAXED_HORIZON_MS = 4 * 60 * 60_000;
const INTENSE_MINIMUM_MS = 2 * 60 * 60_000;
const RELAXED_MINIMUM_MS = 4 * 60 * 60_000;

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
    expect(intense.every((result) => result.state.school.historicMembers > 0)).toBe(true);
    expect(relaxed.every((result) => result.state.school.historicMembers > 0)).toBe(true);
  });

  it("does not make the first school available before the intended session targets", () => {
    const intenseTimes = reachedTimes(intense);
    const relaxedTimes = reachedTimes(relaxed);

    expect(intenseTimes.length).toBeGreaterThan(0);
    expect(relaxedTimes.length).toBeGreaterThan(0);

    if (intenseTimes.length > 0) {
      expect.soft(
        percentile(intenseTimes, 0.1),
        "P10 del primo prestigio intenso: target minimo 2 ore",
      ).toBeGreaterThanOrEqual(INTENSE_MINIMUM_MS);
    }
    if (relaxedTimes.length > 0) {
      expect.soft(
        percentile(relaxedTimes, 0.1),
        "P10 del primo prestigio tranquillo: target minimo 4 ore",
      ).toBeGreaterThanOrEqual(RELAXED_MINIMUM_MS);
    }
  });

  it("keeps the prestige gate exact and exposes the offer only when all requirements are met", () => {
    const startedAt = 1_700_000_000_000;
    let state = createInitialState(startedAt, "Prestige gate test");
    const requirements = getPrestigeRequirements(state);

    state = {
      ...state,
      school: {
        ...state.school,
        historicMembers: requirements.historicMembers - 1,
      },
      collaborators: Array.from({ length: requirements.collaborators }, (_, index) => ({
        id: `collaborator-${index}`,
        contactId: `contact-${index}`,
        displayName: `Collaboratore ${index}`,
        joinedAt: startedAt,
        forms: [],
        instructorForms: [],
        assignment: null,
        rarity: "rare" as const,
      })),
      statistics: {
        ...state.statistics,
        eventsCompleted: requirements.events,
      },
    };
    expect(canFoundSchool(state)).toBe(false);

    state = {
      ...state,
      school: { ...state.school, historicMembers: requirements.historicMembers },
    };
    const ready = gameReducer(state, { type: "TICK", now: startedAt + 1_000 });
    expect(canFoundSchool(ready)).toBe(true);
    expect(ready.network.prestigeOfferSent).toBe(true);
    expect(ready.messages.some((message) => message.subject === "Richiesta apertura nuova scuola")).toBe(true);
  });
});
