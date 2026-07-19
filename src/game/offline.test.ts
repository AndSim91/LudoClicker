import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { simulateOfflineProgress } from "./offline";

describe("offline progress disabled", () => {
  it("freezes fees and shifts every active deadline", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 2, nextFeeAt: 61_000 },
    };
    const result = simulateOfflineProgress(state, 121_000);

    expect(result.summary).toBeNull();
    expect(result.state.school.euros).toBe(0);
    expect(result.state.school.currentMonth).toBe(9);
    expect(result.state.school.nextFeeAt).toBe(181_000);
    expect(result.state.messages[0].subject).not.toBe("Riepilogo attività offline");
    expect(result.state.lastSavedAt).toBe(121_000);
  });

  it("does not cap or process long closures", () => {
    const initial = createInitialState(1_000);
    const result = simulateOfflineProgress(initial, 90_001_000);

    expect(result.summary).toBeNull();
    expect(result.state.school.currentMonth).toBe(9);
    expect(result.state.school.nextFeeAt).toBe(initial.school.nextFeeAt + 90_000_000);
  });

  it("preserves the remaining duration of training", () => {
    const initial = createInitialState(1_000);
    const training = {
      ...initial,
      contacts: initial.contacts.map((contact, index) => index === 0
        ? {
            ...contact,
            training: {
              formId: "form-1" as const,
              startedAt: 2_000,
              completesAt: 12_000,
            },
          }
        : contact),
    };
    const result = simulateOfflineProgress(training, 101_000);
    expect(result.state.contacts[0].training?.completesAt).toBe(112_000);
  });
});
