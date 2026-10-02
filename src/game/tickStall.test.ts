import { describe, expect, it, vi } from "vitest";

// Scenario peggiore: lo scheduler chiede sempre un tick immediato e una
// funzione del tick ricrea lo stato senza cambiarlo. Il tempo deve avanzare lo stesso.
vi.mock("./gameScheduler", async (importOriginal) => ({
  ...await importOriginal<typeof import("./gameScheduler")>(),
  getNextGameTickAt: (_state: unknown, now: number) => now,
}));
vi.mock("./narrativeFlow", async (importOriginal) => {
  const original = await importOriginal<typeof import("./narrativeFlow")>();
  return {
    ...original,
    processNarrativeEvent: (...args: Parameters<typeof original.processNarrativeEvent>) => ({
      ...original.processNarrativeEvent(...args),
    }),
  };
});

const { createInitialState, gameReducer, MAX_CATCH_UP_STEPS_PER_TICK } = await import("./engine");

describe("tick stall guard", () => {
  it("advances game time when a step rebuilds state without doing work", () => {
    const state = createInitialState(1_000);
    const start = state.automation.lastProcessedAt;

    const next = gameReducer(state, {
      type: "TICK",
      now: start + 5_000,
      stepBudget: MAX_CATCH_UP_STEPS_PER_TICK,
    });

    expect(next.automation.lastProcessedAt).toBeGreaterThan(start);
  });
});
