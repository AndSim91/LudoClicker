import { it } from "vitest";
import { percentile, simulateBalanceBatch } from "./balanceSimulation";

const HOUR_MS = 3_600_000;

it("probes 5 relaxed games", async () => {
  const results = await simulateBalanceBatch(
    Array.from({ length: 5 }, (_, index) => index + 1),
    "relaxed",
    600 * HOUR_MS,
    60_000,
  );
  const times = results.flatMap((result) =>
    result.prestigeReadyAtMs === undefined ? [] : [result.prestigeReadyAtMs],
  );
  console.log("BALANCE_PROBE_RELAXED", JSON.stringify({
    reached: times.length,
    total: results.length,
    minHours: Math.min(...times) / HOUR_MS,
    p10Hours: percentile(times, 0.1) / HOUR_MS,
    medianHours: percentile(times, 0.5) / HOUR_MS,
    p90Hours: percentile(times, 0.9) / HOUR_MS,
    maxHours: Math.max(...times) / HOUR_MS,
    unreached: results.filter((result) => !result.reachedPrestige).map((result) => ({
      seed: result.seed,
      members: result.state.school.historicMembers,
      collaborators: result.state.collaborators.length,
      events: result.state.statistics.eventsCompleted,
    })),
  }));
}, 120_000);
