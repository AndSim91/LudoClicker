import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import { createInitialState } from "../../game/engine";
import type { Collaborator, GameState } from "../../game/types";
import { ReptileView } from "./ReptileView";

function collaborator(id: string, assignment: Collaborator["assignment"]): Collaborator {
  return {
    id,
    contactId: `contact-${id}`,
    displayName: `Collaboratore ${id}`,
    joinedAt: 1_000,
    forms: [],
    instructorForms: [],
    technicianForms: [],
    formBranchPreferences: [],
    assignment,
    mastery: createInitialCollaboratorMastery(),
    rarity: "ultra-rare",
  };
}

function unlockedState(): GameState {
  const state = createInitialState(1_000, "Manager");
  return {
    ...state,
    collaborators: [
      collaborator("A", "writing"),
      collaborator("B", "equipment"),
      collaborator("C", "gadget"),
      collaborator("D", "events"),
      collaborator("I", "instructor"),
    ],
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, unlocked: true },
    },
  };
}

const handlers = () => ({
  onStartPreparation: vi.fn(),
  onStartMinigame: vi.fn(),
  onCompleteMinigame: vi.fn(),
  onSkipMinigame: vi.fn(),
  onCancelPreparation: vi.fn(),
  onBookVenue: vi.fn(),
  onAdvancePresentation: vi.fn(),
  onSkipPresentation: vi.fn(),
});

describe("ReptileView", () => {
  it("mostra il requisito nazionale finché l'Open è bloccato", () => {
    render(<ReptileView state={createInitialState(1_000, "Manager")} {...handlers()} />);
    expect(screen.getByRole("heading", { name: "Torneo Reptile" })).toBeVisible();
    expect(screen.getByText(/Vinci il Torneo Nazionale sia in Arena sia in Stile/)).toBeVisible();
  });

  it("distribuisce tutti i non istruttori e richiede almeno uno per settore", () => {
    const actions = handlers();
    render(<ReptileView state={unlockedState()} {...actions} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
    expect(screen.queryByText("Collaboratore I")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Avvia la preparazione" }));
    expect(actions.onStartPreparation).toHaveBeenCalledWith({
      social: ["A"],
      equipment: ["B"],
      gadget: ["C"],
      events: ["D"],
    });
  });
});
