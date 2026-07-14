import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./engine";
import { simulateOfflineProgress } from "./offline";

describe("offline progress", () => {
  it("collects elapsed fees and creates a readable summary", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, nextFeeAt: 61_000 },
    };

    const result = simulateOfflineProgress(state, 121_000);

    expect(result.summary?.elapsedMs).toBe(120_000);
    expect(result.state.school.euros).toBe(40);
    expect(result.state.messages[0].subject).toBe("Riepilogo attività offline");
    expect(result.state.lastSavedAt).toBe(121_000);
  });

  it("caps elapsed time to eight hours", () => {
    const initial = createInitialState(1_000);
    const result = simulateOfflineProgress(initial, 1_000 + GAME_CONFIG.offlineLimitMs + 60_000);

    expect(result.summary?.elapsedMs).toBe(GAME_CONFIG.offlineLimitMs);
    expect(result.summary?.capped).toBe(true);
    expect(result.state.messages[0].preview).toContain("limite di 8 ore");
  });
});
