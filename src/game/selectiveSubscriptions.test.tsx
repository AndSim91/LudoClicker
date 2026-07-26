import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getSocialContentCharacters } from "./social";
import { createInitialState } from "./engine";
import { GameStateProvider } from "./GameStateContext";
import type { Collaborator, GameState } from "./types";
import { CollaboratorSectorPanel } from "../features/people/CollaboratorSectorPanel";
import { CollaboratorSectorView } from "../features/people/CollaboratorSectorView";
import { PeopleView } from "../features/people/PeopleView";

afterEach(cleanup);

const ignore = () => undefined;

function createWriterState(): { state: GameState; writer: Collaborator } {
  const initial = createInitialState(1_000, "Test", false);
  const writer: Collaborator = {
    id: "selective-writer",
    contactId: initial.contacts[0].id,
    displayName: "Redattore Selettivo",
    joinedAt: 1_000,
    forms: [],
    instructorForms: [],
    assignment: "writing",
    rarity: "ultra-rare",
  };
  return {
    writer,
    state: {
      ...initial,
      collaborators: [writer],
      unlocks: { ...initial.unlocks, collaborators: true, social: true },
      collaboratorManagement: {
        ...initial.collaboratorManagement,
        aggregateViewUnlocked: true,
      },
    },
  };
}

describe("selective game subscriptions", () => {
  it("refreshes People income and unlock state when only their indirect slices change", () => {
    const initial = createInitialState(1_000, "Test", false);
    const state = {
      ...initial,
      school: { ...initial.school, activeMembers: 1 },
    };
    const view = (currentState: GameState) => (
      <GameStateProvider state={currentState}>
        <PeopleView onAssign={ignore} onStartTraining={ignore} />
      </GameStateProvider>
    );
    const rendered = render(view(state));

    expect(screen.getByRole("button", { name: /Guadagno al mese: 40,00/ })).toBeVisible();
    expect(screen.queryByText("Collaboratori")).not.toBeInTheDocument();

    rendered.rerender(view({
      ...state,
      school: { ...state.school, activeMembers: 2 },
      unlocks: { ...state.unlocks, collaborators: true },
    }));

    expect(screen.getByRole("button", { name: /Guadagno al mese: 80,00/ })).toBeVisible();
    expect(screen.getByText("Collaboratori")).toBeVisible();
  });

  it("refreshes Social progress when only the automation buffer changes", () => {
    const { state, writer } = createWriterState();
    const collaboratorsById = new Map([[writer.id, writer]]);
    const view = (currentState: GameState) => (
      <GameStateProvider state={currentState}>
        <CollaboratorSectorView
          collaboratorsById={collaboratorsById}
          onIncrement={ignore}
          onDecrement={ignore}
          onStartTraining={ignore}
        />
      </GameStateProvider>
    );
    const rendered = render(view(state));

    expect(screen.getByRole("progressbar", {
      name: "Produzione dei prossimi contenuti Social",
    })).toHaveAttribute("aria-valuenow", "0");
    rendered.rerender(view({
      ...state,
      automation: {
        ...state.automation,
        socialContentBuffer: getSocialContentCharacters(state.upgrades) / 2,
      },
    }));
    expect(screen.getByRole("progressbar", {
      name: "Produzione dei prossimi contenuti Social",
    })).toHaveAttribute("aria-valuenow", "50");
  });

  it("refreshes sector statistics when only statistics change", () => {
    const { state, writer } = createWriterState();
    const statisticsState = {
      ...state,
      unlocks: { ...state.unlocks, social: false },
    };
    const collaboratorsById = new Map([[writer.id, writer]]);
    const view = (currentState: GameState) => (
      <GameStateProvider state={currentState}>
        <CollaboratorSectorPanel
          role="writing"
          collaboratorsById={collaboratorsById}
          onStartTraining={ignore}
          onClose={ignore}
        />
      </GameStateProvider>
    );
    const rendered = render(view(statisticsState));

    const emailStat = screen.getByText("Email inviate").closest("span");
    expect(emailStat).toHaveTextContent("0");
    rendered.rerender(view({
      ...statisticsState,
      statistics: { ...statisticsState.statistics, emailsSent: 7 },
    }));
    expect(emailStat).toHaveTextContent("7");
  });
});
