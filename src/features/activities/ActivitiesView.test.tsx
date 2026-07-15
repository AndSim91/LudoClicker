import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { ActivitiesView } from "./ActivitiesView";

afterEach(() => cleanup());

describe("ActivitiesView", () => {
  it("runs a funded Social campaign after the unlock", () => {
    const initial = createInitialState(1_000);
    const onRunSocialCampaign = vi.fn();
    render(<ActivitiesView state={{ ...initial, school: { ...initial.school, euros: 30 }, unlocks: { ...initial.unlocks, social: true } }} onRunSocialCampaign={onRunSocialCampaign} />);

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

    render(<ActivitiesView state={state} onRunSocialCampaign={() => undefined} />);

    expect(screen.getByText("1/12 completati")).toBeVisible();
    expect(screen.getByText("Passaparola inatteso")).toBeVisible();
    expect(screen.getByText("Sono arrivati nuovi contatti.")).toBeVisible();
  });

  it("keeps later operational panels hidden until they become relevant", () => {
    const initial = createInitialState(1_000);
    render(<ActivitiesView state={initial} onRunSocialCampaign={() => undefined} />);

    expect(screen.queryByText("Fornitura ufficiale · LamaDiLuce")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Assegnazioni collaboratori" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Campagne Social" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Traguardi" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cronaca della scuola" })).not.toBeInTheDocument();
  });
});
