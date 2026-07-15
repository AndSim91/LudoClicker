import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { ActivitiesView } from "./ActivitiesView";

afterEach(() => cleanup());

describe("ActivitiesView", () => {
  it("shows equipment condition and requests maintenance", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 20 },
      equipment: { ...initial.equipment, wear: 45 },
    };
    const onMaintainEquipment = vi.fn();

    render(
      <ActivitiesView state={state} onMaintainEquipment={onMaintainEquipment} onBuyOfficialSword={() => undefined} onRunSocialCampaign={() => undefined} />,
    );

    expect(screen.getByText("Manutenzione consigliata")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Usura attrezzatura" })).toHaveAttribute("aria-valuenow", "45");
    fireEvent.click(screen.getByRole("button", { name: /Esegui manutenzione/ }));
    expect(onMaintainEquipment).toHaveBeenCalledOnce();
  });

  it("requests paid maintenance for a damaged sword even without wear", () => {
    const initial = createInitialState(1_000);
    const onMaintainEquipment = vi.fn();

    render(
      <ActivitiesView
        state={{
          ...initial,
          school: { ...initial.school, euros: 10 },
          equipment: { ...initial.equipment, availableSwords: 5, damagedSwords: 1 },
        }}
        onMaintainEquipment={onMaintainEquipment}
        onBuyOfficialSword={() => undefined}
        onRunSocialCampaign={() => undefined}
      />,
    );

    expect(screen.getByText("Danno da riparare")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Esegui manutenzione/ }));
    expect(onMaintainEquipment).toHaveBeenCalledOnce();
  });

  it("runs a funded Social campaign after the unlock", () => {
    const initial = createInitialState(1_000);
    const onRunSocialCampaign = vi.fn();
    render(<ActivitiesView state={{ ...initial, school: { ...initial.school, euros: 30 }, unlocks: { ...initial.unlocks, social: true } }} onMaintainEquipment={() => undefined} onBuyOfficialSword={() => undefined} onRunSocialCampaign={onRunSocialCampaign} />);

    fireEvent.click(screen.getByRole("button", { name: /Avvia campagna/ }));
    expect(onRunSocialCampaign).toHaveBeenCalledOnce();
  });

  it("shows achievement progress and narrative history", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      achievements: ["first-email" as const],
      narrative: {
        nextEventAt: 10_000,
        history: [{ id: "story-1", definitionId: "word-of-mouth" as const, title: "Passaparola inatteso", occurredAt: 2_000, summary: "Sono arrivati nuovi contatti." }],
      },
      statistics: { ...initial.statistics, narrativeEvents: 1 },
    };

    render(<ActivitiesView state={state} onMaintainEquipment={() => undefined} onBuyOfficialSword={() => undefined} onRunSocialCampaign={() => undefined} />);

    expect(screen.getByText("1/12 completati")).toBeVisible();
    expect(screen.getByText("Passaparola inatteso")).toBeVisible();
    expect(screen.getByText("Sono arrivati nuovi contatti.")).toBeVisible();
  });

  it("orders an official LamaDiLuce sword when the school can afford it", () => {
    const initial = createInitialState(1_000);
    const onBuyOfficialSword = vi.fn();
    render(
      <ActivitiesView
        state={{ ...initial, school: { ...initial.school, euros: 330, peakActiveMembers: 15 } }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSword={onBuyOfficialSword}
        onRunSocialCampaign={() => undefined}
      />,
    );

    expect(screen.getByText("Fornitura ufficiale · LamaDiLuce")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Ordina 1 Polaris/ }));
    expect(onBuyOfficialSword).toHaveBeenCalledOnce();
  });

  it("keeps later operational panels hidden until they become relevant", () => {
    const initial = createInitialState(1_000);
    render(<ActivitiesView state={initial} onMaintainEquipment={() => undefined} onBuyOfficialSword={() => undefined} onRunSocialCampaign={() => undefined} />);

    expect(screen.queryByText("Fornitura ufficiale · LamaDiLuce")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Assegnazioni collaboratori" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Campagne Social" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Traguardi" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cronaca della scuola" })).not.toBeInTheDocument();
  });
});
