import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { Collaborator, GameState } from "../../game/types";
import { ShiftControl } from "./ShiftControl";

afterEach(cleanup);

function eventsCollaborator(index: number): Collaborator {
  return {
    id: `shift-${index}`,
    contactId: `shift-contact-${index}`,
    displayName: `Turno ${index}`,
    joinedAt: 1_000,
    forms: [],
    instructorForms: [],
    assignment: "events",
    rarity: "ultra-rare",
  };
}

function withUpgrades(upgrades: Record<string, number>): GameState {
  const initial = createInitialState(1_000, "", false);
  return {
    ...initial,
    unlocks: { ...initial.unlocks, social: true },
    collaborators: [eventsCollaborator(1), eventsCollaborator(2)],
    upgrades: { ...initial.upgrades, ...upgrades },
  };
}

describe("ShiftControl", () => {
  it("stays hidden until Turni or Priorità operative is bought", () => {
    const { container } = render(<ShiftControl state={withUpgrades({})} onMove={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows who receives help and who is idle, with a fixed row under Turni alone", () => {
    render(<ShiftControl state={withUpgrades({ "collaborator-shifts": 3 })} onMove={vi.fn()} />);
    expect(screen.getByText("Turni")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("fermo")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("moves a sector one place ahead on click once the row is unlocked", () => {
    const onMove = vi.fn();
    render(
      <ShiftControl
        state={withUpgrades({ "collaborator-shifts": 1, "operational-priorities": 1 })}
        onMove={onMove}
      />,
    );
    expect(screen.getByText("Turni e precedenza")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Attrezzatura: passa avanti/ }));
    expect(onMove).toHaveBeenCalledWith("equipment", 1);
  });
});
