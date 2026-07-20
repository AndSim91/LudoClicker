import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { ActivitiesView } from "./ActivitiesView";

afterEach(() => cleanup());

describe("ActivitiesView", () => {
  it("runs a funded Social campaign after the unlock", () => {
    const initial = createInitialState(1_000);
    const onRunSocialCampaign = vi.fn();
    render(<ActivitiesView state={{
      ...initial,
      school: { ...initial.school, euros: 30 },
      unlocks: { ...initial.unlocks, social: true },
      automation: { ...initial.automation, socialBuffer: 0.5 },
      statistics: { ...initial.statistics, socialTrials: 3 },
    }} onRunSocialCampaign={onRunSocialCampaign} />);

    expect(screen.getByText("Ciclo base 60 s · 5,00 € per iscritto · 0,25% prova · 1% contatto"))
      .toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Progresso ciclo pubblicitario Social" }))
      .toHaveAttribute("aria-valuenow", "50");
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

  it("shows the missed renewal student with rarity color and caps the visible history at 30 rows", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      narrative: {
        nextEventAt: 10_000,
        history: Array.from({ length: 35 }, (_, index) => ({
          id: `story-${index}`,
          definitionId: index === 34 ? "missed-renewal" as const : "word-of-mouth" as const,
          title: `Episodio ${index}`,
          occurredAt: 2_000 + index,
          summary: `Dettaglio ${index}`,
          ...(index === 34 ? { person: { displayName: "Allievo Raro", rarity: "rare" as const } } : {}),
        })),
      },
      statistics: { ...initial.statistics, narrativeEvents: 35 },
    };

    render(<ActivitiesView state={state} onRunSocialCampaign={() => undefined} />);

    const region = screen.getByRole("region", { name: "Cronaca della scuola" });
    expect(within(region).getAllByRole("article")).toHaveLength(30);
    expect(within(region).getByText("Allievo Raro")).toHaveClass("rarity-name", "rarity-rare");
    expect(within(region).queryByText("Episodio 4")).not.toBeInTheDocument();
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
