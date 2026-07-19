import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { addAdminMembers } from "../../game/adminFlow";
import { createInitialState } from "../../game/engine";
import { getEligibleSchoolContacts, simulateTournament } from "../../game/tournamentSimulation";
import { TournamentsView } from "./TournamentsView";

function createStateWithForms() {
  const initial = createInitialState(1_000, "Manager");
  const enrolled = addAdminMembers(initial, 10);
  return {
    ...enrolled,
    contacts: enrolled.contacts.map((contact) => contact.status === "enrolled"
      ? { ...contact, forms: ["form-1" as const] }
      : contact),
  };
}

describe("TournamentsView", () => {
  it("shows school readiness and hides stats before Course X", () => {
    const state = createStateWithForms();
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);
    expect(view.getByText("10/10")).toBeVisible();

    fireEvent.click(view.getByRole("tab", { name: "Atleti" }));
    expect(view.getAllByText("???").length).toBeGreaterThan(0);
  });

  it("renders the two podiums and qualifiers of a completed tournament", () => {
    const state = createStateWithForms();
    const simulation = simulateTournament(
      state,
      "school",
      1,
      181_000,
      getEligibleSchoolContacts(state),
    );
    const completed = {
      ...state,
      tournaments: {
        ...state.tournaments,
        results: [simulation.result],
      },
    };
    const { container } = render(<TournamentsView state={completed} />);
    const view = within(container);
    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));
    expect(view.getByText("Podio Arena")).toBeVisible();
    expect(view.getByText("Podio Stile")).toBeVisible();
    expect(view.getByText("Sei qualificati complessivi")).toBeVisible();
  });
});
