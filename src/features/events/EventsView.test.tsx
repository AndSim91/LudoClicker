import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialState } from "../../game/engine";
import type { AcquisitionEvent } from "../../game/types";
import { EventsView } from "./EventsView";

afterEach(() => cleanup());

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
      peopleMet: 0,
      demonstrationsGiven: 0,
      contactReward: undefined as unknown as number,
      membersUsed: 0,
      equipmentUsed: 0,
      wearAdded: 0,
      status: "completed",
    };

    render(
      <EventsView
        state={{ ...initial, acquisitionEvents: [event] }}
        onStart={() => undefined}
      />,
    );

    expect(screen.getByText("0 persone · 0 prove · 0 contatti")).toBeVisible();
  });

  it("starts with only sparring and flyering at very low potential", () => {
    render(<EventsView state={createInitialState(1_000)} onStart={() => undefined} />);

    expect(screen.getAllByText("Potenzialità: Molto bassa")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Sparring al parco" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Volantinaggio organizzato benissimo" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Lezioni all'aperto" })).not.toBeInTheDocument();
    expect(screen.getByText("Prossimo sblocco: Lezioni all'aperto a 5 iscritti.")).toBeVisible();
    expect(screen.queryByText(/Previsione:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/persone →/)).not.toBeInTheDocument();
  });

  it("reveals higher potential events as the school gains members", () => {
    const initial = createInitialState(1_000);
    render(<EventsView state={{
      ...initial,
      school: { ...initial.school, activeMembers: 60 },
    }} onStart={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Mele Comics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "CairoMix" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "CogoComix" })).toBeVisible();
    expect(screen.getByText("Potenzialità: Alta")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Burtomics" })).not.toBeInTheDocument();
    expect(screen.getByText("Prossimo sblocco: Burtomics a 90 iscritti.")).toBeVisible();
  });

  it("shows members and swords available for concurrent events", () => {
    const initial = createInitialState(1_000);
    const running: AcquisitionEvent = {
      id: "running-public-demo",
      definitionId: "public-demo",
      title: "Dimostrazione pubblica",
      location: "Piazza De Ferrari",
      startedAt: Date.now(),
      resolvesAt: Date.now() + 45_000,
      cost: 80,
      peopleMet: 10,
      demonstrationsGiven: 4,
      contactReward: 1,
      membersUsed: 2,
      equipmentUsed: 4,
      wearAdded: 8,
      status: "running",
    };

    render(<EventsView state={{
      ...initial,
      school: { ...initial.school, activeMembers: 5 },
      equipment: { ...initial.equipment, availableSwords: 2 },
      acquisitionEvents: [running],
    }} onStart={() => undefined} />);

    expect(screen.getByText("3/5 iscritti disponibili")).toBeVisible();
    expect(screen.getByText("2/6 spade disponibili")).toBeVisible();
  });

  it("does not show calendar date boxes in the event list", () => {
    const { container } = render(
      <EventsView state={createInitialState(1_000)} onStart={() => undefined} />,
    );

    expect(container.querySelector(".event-date")).not.toBeInTheDocument();
    expect(screen.queryByText("OGGI")).not.toBeInTheDocument();
    expect(screen.queryByText("18:30")).not.toBeInTheDocument();
  });
});
