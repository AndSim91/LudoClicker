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
      <ActivitiesView state={state} onMaintainEquipment={onMaintainEquipment} onRunSocialCampaign={() => undefined} />,
    );

    expect(screen.getByText("Manutenzione consigliata")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Usura attrezzatura" })).toHaveAttribute("aria-valuenow", "45");
    fireEvent.click(screen.getByRole("button", { name: /Esegui manutenzione/ }));
    expect(onMaintainEquipment).toHaveBeenCalledOnce();
  });

  it("runs a funded Social campaign after the unlock", () => {
    const initial = createInitialState(1_000);
    const onRunSocialCampaign = vi.fn();
    render(<ActivitiesView state={{ ...initial, school: { ...initial.school, euros: 30 }, unlocks: { ...initial.unlocks, social: true } }} onMaintainEquipment={() => undefined} onRunSocialCampaign={onRunSocialCampaign} />);

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

    render(<ActivitiesView state={state} onMaintainEquipment={() => undefined} onRunSocialCampaign={() => undefined} />);

    expect(screen.getByText("1/12 completati")).toBeVisible();
    expect(screen.getByText("Passaparola inatteso")).toBeVisible();
    expect(screen.getByText("Sono arrivati nuovi contatti.")).toBeVisible();
  });
});
