import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { AcquisitionEvent } from "../../game/types";
import { EventsView } from "./EventsView";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("EventsView", () => {
  it("does not start the shared clock without running events or cooldowns", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const intervalSpy = vi.spyOn(window, "setInterval");

    render(<EventsView state={createInitialState(1_000)} onStart={() => undefined} />);

    expect(intervalSpy).not.toHaveBeenCalled();
  });

  it("shows zero when a completed event has no contact reward", () => {
    const initial = createInitialState(1_000);
    const event: AcquisitionEvent = {
      id: "activity-without-contacts",
      definitionId: "park-sparring",
      title: "Volantinaggio",
      location: "Centro di Genova",
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
      <EventsView state={{ ...initial, acquisitionEvents: [event] }} onStart={() => undefined} />,
    );

    expect(screen.getByText("0 persone · 0 prove · 0 contatti")).toBeVisible();
  });

  it("starts with only flyering and park sparring at very low potential", () => {
    render(<EventsView state={createInitialState(1_000)} onStart={() => undefined} />);

    expect(screen.getAllByText("Potenzialità: Molto bassa")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Volantinaggio" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Sparring al parco" }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Lezioni all'aperto" })).not.toBeInTheDocument();
    expect(
      screen.queryByText("Prossimo sblocco: Lezioni all'aperto a 5 Fama."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Previsione:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/persone →/)).not.toBeInTheDocument();
  });

  it("shows the five-second duration only while the Events tutorial is pending", () => {
    const initial = createInitialState(1_000);
    const { rerender } = render(<EventsView state={initial} onStart={() => undefined} />);
    const tutorialRow = screen
      .getByRole("heading", { name: "Volantinaggio" })
      .closest("article");
    expect(within(tutorialRow!).getByText("5 secondi")).toBeVisible();
    expect(tutorialRow).toHaveAttribute("data-tutorial-region", "park-sparring-event");
    expect(within(tutorialRow!).getByRole("button", { name: "Partecipa gratis" })).toHaveAttribute(
      "data-tutorial-region",
      "park-sparring-action",
    );

    rerender(
      <EventsView
        state={{
          ...initial,
          tutorial: {
            completedSceneIds: ["first-event"],
            skippedSceneIds: [],
          },
        }}
        onStart={() => undefined}
      />,
    );
    const normalRow = screen.getByRole("heading", { name: "Volantinaggio" }).closest("article");
    expect(within(normalRow!).getByText("10 secondi")).toBeVisible();
  });

  it("reveals higher potential events as the school gains members", () => {
    const initial = createInitialState(1_000);
    render(
      <EventsView
        state={{
          ...initial,
          school: {
            ...initial.school,
            activeMembers: 60,
            peakActiveMembers: 60,
            fame: 60,
          },
        }}
        onStart={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Mele Comics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "CairoMix" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "CogoComix" })).toBeVisible();
    expect(screen.getByText("Potenzialità: Alta")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Burtomics" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Fama della scuola/)).not.toBeInTheDocument();
  });

  it("keeps events unlocked when current members fall below the fame record", () => {
    const initial = createInitialState(1_000);
    render(
      <EventsView
        state={{
          ...initial,
          school: {
            ...initial.school,
            activeMembers: 70,
            peakActiveMembers: 70,
            fame: 100,
          },
        }}
        onStart={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Burtomics" })).toBeVisible();
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

    render(
      <EventsView
        state={{
          ...initial,
          school: { ...initial.school, activeMembers: 5 },
          equipment: { ...initial.equipment, availableSwords: 2 },
          acquisitionEvents: [running],
        }}
        onStart={() => undefined}
      />,
    );

    expect(screen.getByText("3/5 iscritti disponibili")).toBeVisible();
    const equipmentPanel = screen.getByRole("region", {
      name: "Risorse disponibili per gli eventi",
    });
    expect(within(equipmentPanel).getByText("2/6 spade disponibili")).toBeVisible();
  });

  it("offers cancellation for a running event", () => {
    const initial = createInitialState(1_000);
    const event: AcquisitionEvent = {
      id: "running-public-demo",
      definitionId: "public-demo",
      title: "Dimostrazione pubblica",
      location: "Piazza De Ferrari",
      startedAt: 2_000,
      resolvesAt: 47_000,
      cost: 120,
      peopleMet: 10,
      demonstrationsGiven: 4,
      contactReward: 3,
      membersUsed: 2,
      equipmentUsed: 4,
      wearAdded: 10,
      status: "running",
    };
    const onCancel = vi.fn();

    render(
      <EventsView
        state={{ ...initial, acquisitionEvents: [event] }}
        onStart={() => undefined}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Annulla evento" }));

    expect(onCancel).toHaveBeenCalledWith(event.id);
  });

  it("shows a realtime cooldown and disables the event action", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const initial = createInitialState(1_000);
    const now = Date.now();

    render(
      <EventsView
        state={{
          ...initial,
          activities: {
            eventCooldowns: {
              "park-sparring": {
                kind: "realtime",
                startedAt: now,
                availableAt: now + 5_000,
              },
            },
          },
        }}
        onStart={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Disponibile tra 5 secondi" })).toBeDisabled();
    const cooldownBar = screen.getByRole("progressbar", {
      name: "Cooldown Volantinaggio",
    });
    expect(cooldownBar).toHaveAttribute("aria-valuetext", "Disponibile tra 5 secondi");
    expect(cooldownBar).toHaveAttribute("aria-valuenow", "100");
    expect(cooldownBar.firstElementChild).toHaveStyle({ width: "100%" });
  });

  it("shows calendar cooldowns in game months", () => {
    const initial = createInitialState(1_000);

    render(
      <EventsView
        state={{
          ...initial,
          school: {
            ...initial.school,
            activeMembers: 20,
            fame: 20,
            nextFeeAt: Date.now() + 60_000,
          },
          activities: {
            eventCooldowns: {
              "local-event": {
                kind: "calendar",
                startedMonthPosition: initial.school.currentMonth,
                availableAtMonth: initial.school.currentMonth + 3,
              },
            },
          },
        }}
        onStart={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Disponibile tra 3 mesi" })).toBeDisabled();
    expect(screen.getByRole("progressbar", { name: "Cooldown Mele Comics" })).toBeVisible();
  });

  it("marks damaged swords as unavailable until maintenance", () => {
    const initial = createInitialState(1_000);
    render(
      <EventsView
        state={{
          ...initial,
          school: {
            ...initial.school,
            activeMembers: 10,
            peakActiveMembers: 10,
            fame: 10,
            euros: 240,
          },
          equipment: { ...initial.equipment, availableSwords: 5, damagedSwords: 1 },
        }}
        onStart={() => undefined}
      />,
    );

    const equipmentPanel = screen.getByRole("region", {
      name: "Risorse disponibili per gli eventi",
    });
    expect(within(equipmentPanel).getByText("5/6 spade disponibili")).toBeVisible();
    expect(screen.getByText("1 spada danneggiata. Riparale da La mia giornata.")).toBeVisible();
    expect(within(equipmentPanel).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows no swords available when every sword is damaged", () => {
    const initial = createInitialState(1_000);
    render(
      <EventsView
        state={{
          ...initial,
          equipment: { ...initial.equipment, availableSwords: 0, wear: 0, damagedSwords: 6 },
        }}
        onStart={() => undefined}
      />,
    );

    const equipmentPanel = screen.getByRole("region", {
      name: "Risorse disponibili per gli eventi",
    });
    expect(within(equipmentPanel).getByText("0/6 spade disponibili")).toBeVisible();
    expect(screen.getByText("6 spade danneggiate. Riparale da La mia giornata.")).toBeVisible();
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
