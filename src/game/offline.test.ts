import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState } from "./engine";
import { getOfflineLimitMs, simulateOfflineProgress } from "./offline";

describe("offline progress", () => {
  it("collects elapsed fees and creates a readable summary", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, nextFeeAt: 61_000 },
    };

    const result = simulateOfflineProgress(state, 121_000);

    expect(result.summary?.elapsedMs).toBe(120_000);
    expect(result.state.school.euros).toBe(160);
    expect(result.state.school.currentMonth).toBe(3);
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

  it("extends the offline limit to twenty-four hours with multi-site coordination", () => {
    const initial = createInitialState(1_000);
    const coordinated = {
      ...initial,
      upgrades: { ...initial.upgrades, "multi-site-coordination": 5 },
    };

    expect(getOfflineLimitMs(coordinated)).toBe(GAME_CONFIG.offlineMaxLimitMs);
  });
});
