import { describe, expect, it } from "vitest";
import { createInitialState } from "./engine";
import { rebaseGameTimeline } from "./gameTimeline";

describe("game timeline", () => {
  it("preserves remaining durations while normalizing timestamps", () => {
    const state = createInitialState(10_000, "Timeline test");
    const withRuntimeWork = {
      ...state,
      pendingEmailOutcomes: [{
        id: "outcome-1",
        emailId: state.emails[0].id,
        contactId: state.contacts[0].id,
        resolvesAt: 25_000,
        result: "lost" as const,
      }],
      activities: {
        eventCooldowns: {
          "park-sparring": {
            kind: "realtime" as const,
            startedAt: 12_000,
            availableAt: 22_000,
          },
        },
      },
      shortGoal: {
        ...state.shortGoal,
        isActive: false,
        reactivationStartedAt: 12_000,
      },
    };

    const rebased = rebaseGameTimeline(withRuntimeWork, 20_000, 2_000);

    expect(rebased.lastSavedAt).toBe(2_000);
    expect(rebased.school.nextFeeAt - rebased.lastSavedAt).toBe(
      state.school.nextFeeAt - 20_000,
    );
    expect(rebased.pendingEmailOutcomes[0].resolvesAt - rebased.lastSavedAt)
      .toBe(5_000);
    expect(rebased.activities.eventCooldowns["park-sparring"]).toEqual({
      kind: "realtime",
      startedAt: -6_000,
      availableAt: 4_000,
    });
    expect(rebased.contacts[0].acquiredAt).toBe(state.contacts[0].acquiredAt - 18_000);
    expect(rebased.messages[0].receivedAt).toBe(state.messages[0].receivedAt - 18_000);
    expect(rebased.shortGoal.reactivationStartedAt).toBe(-6_000);
  });
});
