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
          forms: ["form-1" as const, "course-x" as const, "form-2" as const, "course-y" as const],
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
      "Email lasciata: 70%",
    );
    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "Comparsa: 5% dalla 10ª email",
    );
    expect(screen.getByRole("region", { name: "Sistema di rarità" })).toHaveTextContent(
      "RaroComparsa: 10% dei contatti non leggendari",
    );
    fireEvent.click(screen.getByRole("tab", { name: /Collaboratori/ }));
    expect(screen.getByText("Andrea Simonazzi")).toHaveClass("rarity-legendary");
    expect(screen.getByText("VIP")).toBeVisible();
    expect(screen.queryByText("Tutorial")).not.toBeInTheDocument();
    expect(screen.getByText(/Livello Leggendario/)).toBeVisible();
    expect(screen.getByText(/Potere VIP ×2/)).toBeVisible();
    fireEvent.change(screen.getByRole("combobox", { name: "Assegnazione" }), {
      target: { value: "writing" },
    });

    expect(onAssign).toHaveBeenCalledWith("collaborator-1", "writing");
  });

  it("starts the Form path from an enrolled member", () => {
    const initial = createInitialState(1_000);
    const enrolled = { ...initial.contacts[0], status: "enrolled" as const };
    const onStartTraining = vi.fn();
    render(<PeopleView state={{ ...initial, school: { ...initial.school, activeMembers: 1, euros: 20 }, contacts: initial.contacts.map((contact) => contact.id === enrolled.id ? enrolled : contact), unlocks: { ...initial.unlocks, forms: true } }} onAssign={() => undefined} onStartTraining={onStartTraining} />);

    fireEvent.click(screen.getByRole("tab", { name: /Iscritti/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Formazione per Giulia Ferrando" }), { target: { value: "form-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Avvia" }));

    expect(onStartTraining).toHaveBeenCalledWith(enrolled.id, "form-1");
  });
});
