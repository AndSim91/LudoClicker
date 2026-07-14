import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import type { AcquisitionEvent } from "../../game/types";
import { EventsView } from "./EventsView";

describe("EventsView", () => {
  it("shows zero when a completed event has no contact reward", () => {
    const initial = createInitialState(1_000);
    const event: AcquisitionEvent = {
      id: "activity-without-contacts",
      definitionId: "park-sparring",
      title: "Sparring al parco",
      location: "Parco di Villa Croce",
      startedAt: 2_000,
      resolvesAt: 3_000,
      cost: 0,
      contactReward: undefined as unknown as number,
      status: "completed",
    };

    render(
      <EventsView
        state={{ ...initial, acquisitionEvents: [event] }}
        onStart={() => undefined}
      />,
    );

    expect(screen.getByText("0 contatti ottenuti")).toBeVisible();
  });
});
