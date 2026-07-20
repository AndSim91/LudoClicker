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

    render(
      <EventsView
        state={{ ...initial, school: { ...initial.school, euros: 100 }, equipment: { ...initial.equipment, wear: 45 } }}
        onStart={() => undefined}
        onMaintainEquipment={onMaintainEquipment}
      />,
    );

    expect(screen.getByText("Danno da riparare")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Usura attrezzatura" })).toHaveAttribute("aria-valuenow", "45");
    fireEvent.click(screen.getByRole("button", { name: /Esegui manutenzione/ }));
    expect(onMaintainEquipment).toHaveBeenCalledOnce();
  });

  it("requests paid maintenance for a damaged sword even without wear", () => {
    const initial = createInitialState(1_000);
    const onMaintainEquipment = vi.fn();

    render(
      <EventsView
        state={{ ...initial, school: { ...initial.school, euros: 50 }, equipment: { ...initial.equipment, availableSwords: 5, damagedSwords: 1 } }}
        onStart={() => undefined}
        onMaintainEquipment={onMaintainEquipment}
      />,
    );

    expect(screen.getByText("Danno da riparare")).toBeVisible();
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
    expect(screen.getByText("Prossimo sblocco: Lezioni all'aperto a 5 Fama.")).toBeVisible();
    expect(screen.queryByText(/Previsione:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/persone →/)).not.toBeInTheDocument();
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
    expect(screen.getByText("Prossimo sblocco: Burtomics a 90 Fama.")).toBeVisible();
  });

  it("keeps events unlocked when current members fall below the fame record", () => {
    const initial = createInitialState(1_000);
    render(<EventsView state={{
      ...initial,
      school: { ...initial.school, activeMembers: 70, peakActiveMembers: 70, historicMembers: 100 },
    }} onStart={() => undefined} />);

    expect(screen.getByText("Fama della scuola: 100")).toBeVisible();
    expect(screen.getByText("Equivale al totale cumulativo delle iscrizioni e non diminuisce quando qualcuno lascia la scuola.")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Burtomics" })).toBeVisible();
    expect(screen.getByText("Prossimo sblocco: Genova Comics & Games a 120 Fama.")).toBeVisible();
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
    expect(screen.getByRole("button", { name: "Ripara 1 spada" })).toBeDisabled();
  });

  it("shows no swords available at full wear", () => {
    const initial = createInitialState(1_000);
    render(<EventsView
      state={{
        ...initial,
        equipment: { ...initial.equipment, wear: 100, damagedSwords: 0 },
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
