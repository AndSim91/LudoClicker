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
          displayName: "Giulia Ferrando",
          joinedAt: 1_000,
          forms: [],
          assignment: null,
        },
      ],
      unlocks: { ...initial.unlocks, collaborators: true },
    };
    const onAssign = vi.fn();
    render(<PeopleView state={state} onAssign={onAssign} onStartTraining={() => undefined} />);

    fireEvent.click(screen.getByRole("tab", { name: /Collaboratori/ }));
    expect(screen.getByText("Giulia Ferrando")).toBeVisible();
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
    };
    const onStartTraining = vi.fn();
    render(<PeopleView state={{ ...initial, school: { ...initial.school, euros: 20 }, collaborators: [collaborator], unlocks: { ...initial.unlocks, collaborators: true, forms: true } }} onAssign={() => undefined} onStartTraining={onStartTraining} />);

    fireEvent.click(screen.getByRole("tab", { name: /Collaboratori/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Formazione per Giulia Ferrando" }), { target: { value: "form-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Avvia" }));

    expect(onStartTraining).toHaveBeenCalledWith("collaborator-form", "form-1");
  });
});
