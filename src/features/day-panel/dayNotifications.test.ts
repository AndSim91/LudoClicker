import { describe, expect, it } from "vitest";

import { createInitialState } from "../../game/engine";
import { LIGHT_INFLATION_CAUSES, LIGHT_INFLATION_EVENT_TITLE } from "../../game/lightInflation";
import { selectDayNotifications } from "./dayNotifications";

describe("selectDayNotifications", () => {
  it("shows light inflation only from its occurrence until its own 20-second expiry", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      lightInflation: {
        ...initial.lightInflation,
        event: {
          cause: LIGHT_INFLATION_CAUSES[0],
          occurredAt: 50_000,
          visibleUntil: 70_000,
        },
      },
    };

    expect(selectDayNotifications(state, 49_999)).not.toContainEqual(
      expect.objectContaining({ id: "light-inflation" }),
    );
    expect(selectDayNotifications(state, 50_000)).toContainEqual(
      expect.objectContaining({
        id: "light-inflation",
        title: LIGHT_INFLATION_EVENT_TITLE,
        expiresAt: 70_000,
        expiryDurationMs: 20_000,
      }),
    );
    expect(selectDayNotifications(state, 70_000)).not.toContainEqual(
      expect.objectContaining({ id: "light-inflation" }),
    );
  });
});
