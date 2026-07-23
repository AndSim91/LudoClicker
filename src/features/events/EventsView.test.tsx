import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { AcquisitionEvent } from "../../game/types";
import { EventsView } from "./EventsView";

afterEach(() => cleanup());

describe("EventsView", () => {
  it("shows equipment condition and requests maintenance", () => {
    const initial = createInitialState(1_000);
    const onMaintainEquipment = vi.fn();

    const { container } = render(
      <EventsView
        state={{
          ...initial,
          school: { ...initial.school, euros: 100 },
          equipment: { ...initial.equipment, availableSwords: 5, wear: 45 },
        }}
        onStart={() => undefined}
        onMaintainEquipment={onMaintainEquipment}
      />,
    );

    expect(screen.queryByText("Manutenzione consigliata")).not.toBeInTheDocument();
    expect(screen.getByText("Usura")).toBeVisible();
    expect(screen.getByText(/Disponibile/)).toBeVisible();
    expect(screen.queryByText("455 pt")).not.toBeInTheDocument();
    expect(screen.getByText("5/6 spade disponibili")).toBeVisible();
    expect(screen.queryByText("Usura complessiva 45/600")).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar", {
      name: "Usura complessiva attrezzatura",
    })).toHaveAttribute("aria-valuenow", "45");
    expect(container.querySelectorAll(".equipment-sword-cell")).toHaveLength(6);
    expect(container.querySelectorAll(".equipment-sword-cell.is-reserved")).toHaveLength(1);
    expect(container.querySelectorAll(".equipment-sword-load")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /Esegui manutenzione/ }));
    expect(onMaintainEquipment).toHaveBeenCalledOnce();
  });

  it("requests paid maintenance for a damaged sword even without wear", () => {
    const initial = createInitialState(1_000);
    const onMaintainEquipment = vi.fn();

    render(
      <EventsView
        state={{ ...initial, school: { ...initial.school, euros: 250 }, equipment: { ...initial.equipment, availableSwords: 5, damagedSwords: 1 } }}
        onStart={() => undefined}
        onMaintainEquipment={onMaintainEquipment}
      />,
    );

    expect(screen.queryByText("Danno da riparare")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Esegui manutenzione/ }));
    expect(onMaintainEquipment).toHaveBeenCalledOnce();
  });

  it("orders an official LamaDiLuce sword when the school can afford it", () => {
    const initial = createInitialState(1_000);
    const onBuyOfficialSword = vi.fn();

    render(
      <EventsView
        state={{ ...initial, school: { ...initial.school, euros: 330, peakActiveMembers: 15 } }}
        onStart={() => undefined}
        onBuyOfficialSword={onBuyOfficialSword}
      />,
    );

    expect(screen.getByText("Fornitura ufficiale · LamaDiLuce")).toBeVisible();
    expect(screen.getByText("Polaris EVO Basic")).toBeVisible();
    expect(screen.queryByRole("link", { name: "lamadiluce.it" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ordina 1 Polaris/ }));
    expect(onBuyOfficialSword).toHaveBeenCalledOnce();
  });

  it("shows zero when a completed event has no contact reward", () => {
    const initial = createInitialState(1_000);
    const event: AcquisitionEvent = {
      id: "activity-without-contacts",
      definitionId: "park-sparring",
      title: "Sparring al parco",
      location: "Parco Carlo Alberto Dalla Chiesa",
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
    expect(screen.queryByText("Prossimo sblocco: Lezioni all'aperto a 5 Fama."))
      .not.toBeInTheDocument();
    expect(screen.queryByText(/Previsione:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/persone →/)).not.toBeInTheDocument();
  });

  it("shows broken, reserved, worn and healthy capacity in separate sword blocks", () => {
    const initial = createInitialState(1_000);
    const { container } = render(
      <EventsView
        state={{
          ...initial,
          equipment: {
            ...initial.equipment,
            availableSwords: 3,
            damagedSwords: 1,
            wear: 45,
          },
        }}
        onStart={() => undefined}
      />,
    );

    const bar = screen.getByRole("progressbar", {
      name: "Usura complessiva attrezzatura",
    });
    expect(bar).toHaveAttribute("aria-valuemax", "600");
    expect(bar).toHaveAttribute("aria-valuenow", "145");
    expect(bar).toHaveAttribute(
      "aria-valuetext",
      "1 spada rotta, 2 spade riservate, 45 punti di usura normale, 255 punti disponibili",
    );
    expect(container.querySelectorAll(".equipment-sword-cell")).toHaveLength(6);
    expect(container.querySelectorAll(".equipment-sword-cell.is-broken")).toHaveLength(1);
    expect(container.querySelectorAll(".equipment-sword-cell.is-reserved")).toHaveLength(2);
    expect(container.querySelectorAll(".equipment-sword-cell.is-available")).toHaveLength(3);
  });

  it("switches to one aggregate bar above twenty swords", () => {
    const initial = createInitialState(1_000);
    const { container } = render(
      <EventsView
        state={{
          ...initial,
          equipment: {
            ...initial.equipment,
            totalSwords: 100,
            availableSwords: 99,
            damagedSwords: 0,
            wear: 38,
          },
        }}
        onStart={() => undefined}
      />,
    );

    const bar = screen.getByRole("progressbar", {
      name: "Usura complessiva attrezzatura",
    });
    expect(bar).toHaveClass("is-aggregate");
    expect(bar).toHaveAttribute("aria-valuemax", "10000");
    expect(bar).toHaveAttribute("aria-valuenow", "38");
    expect(container.querySelectorAll(".equipment-sword-cell")).toHaveLength(0);
    expect(container.querySelector(".equipment-condition-segment.is-reserved"))
      .toHaveStyle({ width: "1%" });
    expect(container.querySelector(".equipment-condition-segment.is-load"))
      .toHaveStyle({ width: "0.38%" });
    expect(container.querySelector(".equipment-condition-segment.is-healthy"))
      .toHaveStyle({ width: "98.62%" });
  });

  it("shows the five-second duration only while the Events tutorial is pending", () => {
    const initial = createInitialState(1_000);
    const { rerender } = render(
      <EventsView state={initial} onStart={() => undefined} />,
    );
    const tutorialRow = screen.getByRole("heading", { name: "Sparring al parco" })
      .closest("article");
    expect(within(tutorialRow!).getByText("5 secondi")).toBeVisible();
    expect(tutorialRow).toHaveAttribute("data-tutorial-region", "park-sparring-event");
    expect(within(tutorialRow!).getByRole("button", { name: "Partecipa gratis" }))
      .toHaveAttribute("data-tutorial-region", "park-sparring-action");

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
    const normalRow = screen.getByRole("heading", { name: "Sparring al parco" })
      .closest("article");
    expect(within(normalRow!).getByText("10 secondi")).toBeVisible();
  });

  it("reveals higher potential events as the school gains members", () => {
    const initial = createInitialState(1_000);
    render(<EventsView state={{
      ...initial,
      school: { ...initial.school, activeMembers: 60, peakActiveMembers: 60, historicMembers: 60 },
    }} onStart={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Mele Comics" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "CairoMix" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "CogoComix" })).toBeVisible();
    expect(screen.getByText("Potenzialità: Alta")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Burtomics" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Fama della scuola/)).not.toBeInTheDocument();
  });

  it("keeps events unlocked when current members fall below the fame record", () => {
    const initial = createInitialState(1_000);
    render(<EventsView state={{
      ...initial,
      school: { ...initial.school, activeMembers: 70, peakActiveMembers: 70, historicMembers: 100 },
    }} onStart={() => undefined} />);

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

    render(<EventsView state={{
      ...initial,
      school: { ...initial.school, activeMembers: 5 },
      equipment: { ...initial.equipment, availableSwords: 2 },
      acquisitionEvents: [running],
    }} onStart={() => undefined} />);

    expect(screen.getByText("3/5 iscritti disponibili")).toBeVisible();
    const equipmentPanel = screen.getByRole("region", { name: "Risorse disponibili per gli eventi" });
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
    const initial = createInitialState(1_000);
    const now = Date.now();

    render(<EventsView
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
    />);

    expect(screen.getByRole("button", { name: "Disponibile tra 5 secondi" })).toBeDisabled();
    expect(screen.getByRole("progressbar", { name: "Cooldown Sparring al parco" }))
      .toHaveAttribute("aria-valuetext", "Disponibile tra 5 secondi");
  });

  it("shows calendar cooldowns in game months", () => {
    const initial = createInitialState(1_000);

    render(<EventsView
      state={{
        ...initial,
        school: {
          ...initial.school,
          activeMembers: 20,
          historicMembers: 20,
          nextFeeAt: Date.now() + 60_000,
        },
        activities: {
          eventCooldowns: {
            "local-event": {
              kind: "calendar",
              startedMonthPosition: initial.school.currentMonth,
              availableAtMonth: initial.school.currentMonth + 1,
            },
          },
        },
      }}
      onStart={() => undefined}
    />);

    expect(screen.getByRole("button", { name: "Disponibile tra 1 mese" })).toBeDisabled();
    expect(screen.getByRole("progressbar", { name: "Cooldown Mele Comics" })).toBeVisible();
  });

  it("marks damaged swords as unavailable until maintenance", () => {
    const initial = createInitialState(1_000);
    render(<EventsView
      state={{
        ...initial,
        school: { ...initial.school, activeMembers: 10, peakActiveMembers: 10, historicMembers: 10, euros: 240 },
        equipment: { ...initial.equipment, availableSwords: 5, damagedSwords: 1 },
      }}
      onStart={() => undefined}
    />);

    const equipmentPanel = screen.getByRole("region", { name: "Risorse disponibili per gli eventi" });
    expect(within(equipmentPanel).getByText("5/6 spade disponibili")).toBeVisible();
    expect(screen.getByText("1 spada danneggiata · ripara per usarle agli eventi")).toBeVisible();
    expect(screen.getByRole("button", { name: /Servono almeno/ })).toBeDisabled();
  });

  it("shows no swords available when every sword is damaged", () => {
    const initial = createInitialState(1_000);
    render(<EventsView
      state={{
        ...initial,
        equipment: { ...initial.equipment, availableSwords: 0, wear: 0, damagedSwords: 6 },
      }}
      onStart={() => undefined}
    />);

    const equipmentPanel = screen.getByRole("region", { name: "Risorse disponibili per gli eventi" });
    expect(within(equipmentPanel).getByText("0/6 spade disponibili")).toBeVisible();
    expect(screen.getByText("6 spade danneggiate · ripara per usarle agli eventi")).toBeVisible();
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
