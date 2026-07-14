import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { PeopleView } from "./PeopleView";

afterEach(() => cleanup());

describe("PeopleView", () => {
  it("shows collaborators and changes their single assignment", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      collaborators: [
        {
          id: "collaborator-1",
          contactId: initial.contacts[0].id,
          displayName: "Andrea Simonazzi",
          joinedAt: 1_000,
          forms: [],
          assignment: null,
          rarity: "legendary" as const,
          specialProfileId: "andrea-simonazzi" as const,
        },
      ],
      unlocks: { ...initial.unlocks, collaborators: true },
    };
    const onAssign = vi.fn();
    render(<PeopleView state={state} onAssign={onAssign} onStartTraining={() => undefined} />);

    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "Email lasciata: 85%",
    );
    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "Comparsa: 5% dalla 10ª email",
    );
    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "Funnel stimato: 10,2%",
    );
    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "Funnel stimato: 0,1%",
    );
    fireEvent.click(screen.getByRole("tab", { name: /Collaboratori/ }));
    expect(screen.getByText("Andrea Simonazzi")).toHaveClass("special-name");
    expect(screen.getByText("VIP")).toBeVisible();
    expect(screen.queryByText("Tutorial")).not.toBeInTheDocument();
    expect(screen.getByText(/Livello Leggendario/)).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "Assegnazione" }), {
      target: { value: "writing" },
    });

    expect(onAssign).toHaveBeenCalledWith("collaborator-1", "writing");
  });

  it("starts an available Form training path", () => {
    const initial = createInitialState(1_000);
    const collaborator = {
      id: "collaborator-form",
      contactId: initial.contacts[0].id,
      displayName: "Giulia Ferrando",
      joinedAt: 1_000,
      forms: [],
      assignment: null,
      rarity: "common" as const,
    };
    const onStartTraining = vi.fn();
    render(<PeopleView state={{ ...initial, school: { ...initial.school, euros: 20 }, collaborators: [collaborator], unlocks: { ...initial.unlocks, collaborators: true, forms: true } }} onAssign={() => undefined} onStartTraining={onStartTraining} />);

    fireEvent.click(screen.getByRole("tab", { name: /Collaboratori/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Formazione per Giulia Ferrando" }), { target: { value: "form-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Avvia" }));

    expect(onStartTraining).toHaveBeenCalledWith("collaborator-form", "form-1");
  });
});
