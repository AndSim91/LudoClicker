import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createInitialCollaboratorMastery } from "../../content/mastery";
import { createInitialState } from "../../game/engine";
import { organizeReptile } from "../../game/reptilePreparation";
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
    school: { ...state.school, euros: 20_000 },
    collaborators: [
      collaborator("A", "writing"),
      collaborator("B", "equipment"),
      collaborator("D", "events"),
    ],
    tournaments: {
      ...state.tournaments,
      reptile: { ...state.tournaments.reptile, unlocked: true },
    },
  };
}

const handlers = () => ({
  onOrganize: vi.fn(),
  onCancel: vi.fn(),
  onPlayMinigame: vi.fn(),
  onOpenTutorial: vi.fn(),
  onReplayDay: vi.fn(),
});

describe("ReptileView", () => {
  it("mostra il requisito nazionale finché l'Open è bloccato", () => {
    render(<ReptileView state={createInitialState(1_000, "Manager")} {...handlers()} />);
    expect(screen.getByRole("heading", { name: "Torneo Reptile" })).toBeVisible();
    expect(screen.getByText(/Vinci il Torneo Nazionale sia in Arena sia in Stile/)).toBeVisible();
  });

  it("organizza con un clic, senza stepper né menu per collaboratore", () => {
    const actions = handlers();
    render(<ReptileView state={unlockedState()} {...actions} />);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Organizza ·/ }));
    expect(actions.onOrganize).toHaveBeenCalledOnce();
  });

  it("in preparazione mostra le barre, la barra ferma, il minigioco e annulla con conferma", () => {
    const actions = handlers();
    const organized = organizeReptile(unlockedState(), 1_000);
    render(<ReptileView state={organized} {...actions} />);
    expect(screen.getAllByRole("progressbar")).toHaveLength(4);
    expect(screen.getByText(/Nessuno a Istruttori: la barra non si muove/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Tutorial" }));
    expect(actions.onOpenTutorial).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Gioca" }));
    expect(actions.onPlayMinigame).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /Annulla il torneo/ }));
    expect(actions.onCancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sì, annulla" }));
    expect(actions.onCancel).toHaveBeenCalledOnce();
  });
});
