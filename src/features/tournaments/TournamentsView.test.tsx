import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { addAdminMembers } from "../../game/adminFlow";
import { createInitialState } from "../../game/engine";
import { getEligibleSchoolContacts, simulateTournament } from "../../game/tournamentSimulation";
import { TournamentsView } from "./TournamentsView";

function createStateWithForms() {
  const initial = createInitialState(1_000, "Manager");
  const enrolled = addAdminMembers(initial, 6);
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
    expect(view.getByText("6/6")).toBeVisible();

    fireEvent.click(view.getByRole("tab", { name: "Atleti" }));
    expect(view.getAllByText("???").length).toBeGreaterThan(0);
  });

  it("shows the experience count and includes its bonus in Arena and Style", () => {
    const initial = createStateWithForms();
    const target = initial.contacts.find((contact) => contact.status === "enrolled")!;
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) => contact.id === target.id
        ? {
            ...contact,
            forms: ["form-1" as const, "course-x" as const],
            arenaBase: 100,
            styleBase: 50,
            tournamentExperience: 10,
          }
        : contact),
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Atleti" }));
    const athleteName = view.getByText(`${target.firstName} ${target.lastName}`);
    const athleteCard = within(athleteName.closest("article")!);
    const arena = athleteCard.getByText("143.000");
    const style = athleteCard.getByText("71.500");

    expect(arena).toHaveClass("official-stat-value");
    expect(arena).toHaveStyle({ color: "rgb(176, 128, 0)" });
    expect(style).toHaveClass("official-stat-value");
    expect(style).toHaveStyle({ color: "rgb(16, 53, 35)" });
    expect(athleteCard.getByText("10", { exact: true })).toBeVisible();
    expect(athleteCard.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("colors Arena and Style red when their prepared value exceeds 150", () => {
    const initial = createStateWithForms();
    const target = initial.contacts.find((contact) => contact.status === "enrolled")!;
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) => contact.id === target.id
        ? {
            ...contact,
            forms: ["form-1" as const, "course-x" as const],
            arenaBase: 100,
            styleBase: 100,
            tournamentExperience: 20,
          }
        : contact),
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Atleti" }));
    const athleteName = view.getByText(`${target.firstName} ${target.lastName}`);
    const athleteCard = within(athleteName.closest("article")!);
    const preparedStats = athleteCard.getAllByText("176.000");

    expect(preparedStats).toHaveLength(2);
    preparedStats.forEach((stat) => {
      expect(stat).toHaveStyle({ color: "rgb(196, 43, 28)" });
    });
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

  it("highlights school athletes in the podium and qualifier list", () => {
    const state = createStateWithForms();
    const simulation = simulateTournament(
      state,
      "school",
      1,
      181_000,
      getEligibleSchoolContacts(state),
    );
    const ownedParticipant = simulation.result.participants.find((participant) => participant.ownedContactId)!;
    const completed = {
      ...state,
      tournaments: {
        ...state.tournaments,
        results: [{
          ...simulation.result,
          arenaPodium: [{ ...simulation.result.arenaPodium[0], participantId: ownedParticipant.id }],
          qualifiers: [{
            ...simulation.result.qualifiers[0],
            participantId: ownedParticipant.id,
            ownedContactId: ownedParticipant.ownedContactId,
          }],
        }],
      },
    };
    const { container } = render(<TournamentsView state={completed} />);
    const view = within(container);
    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));
    const ownedName = `${ownedParticipant.firstName} ${ownedParticipant.lastName}`;
    const nameNodes = view.getAllByText(ownedName);

    expect(nameNodes.some((node) => node.closest(".tournament-podium > div")?.classList.contains("owned-athlete"))).toBe(true);
    expect(nameNodes.some((node) => node.closest(".tournament-qualifiers > div > span")?.classList.contains("owned-athlete"))).toBe(true);
  });
});
