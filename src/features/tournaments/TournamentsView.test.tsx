import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { addAdminMembers } from "../../game/adminFlow";
import { createInitialState } from "../../game/engine";
import { getEligibleSchoolContacts, simulateTournament } from "../../game/tournamentSimulation";
import { TournamentsView } from "./TournamentsView";

function createStateWithForms(memberCount = 6) {
  const initial = createInitialState(1_000, "Manager");
  const enrolled = addAdminMembers(initial, memberCount);
  return {
    ...enrolled,
    contacts: enrolled.contacts.map((contact) => contact.status === "enrolled"
      ? { ...contact, forms: ["form-1" as const] }
      : contact),
  };
}

function createCompletedTournamentState() {
  const state = createStateWithForms();
  const simulation = simulateTournament(
    state,
    "school",
    1,
    181_000,
    getEligibleSchoolContacts(state),
  );
  return {
    state: {
      ...state,
      tournaments: {
        ...state.tournaments,
        results: [simulation.result],
      },
    },
    result: simulation.result,
  };
}

describe("TournamentsView", () => {
  it("virtualizes a large athlete roster", () => {
    const state = createStateWithForms(160);
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Atleti" }));

    const renderedRows = container.querySelectorAll(
      ".athlete-table tbody tr:not(.virtual-table-spacer)",
    );
    expect(renderedRows.length).toBeGreaterThan(0);
    expect(renderedRows.length).toBeLessThan(40);
    expect(view.getByText("160 atleti")).toBeVisible();
  });

  it("shows the tournament overview and hides official stats before Course X", () => {
    const state = createStateWithForms();
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    expect(view.getByText("Calendario della stagione")).toBeVisible();
    expect(view.getAllByText("6/6").length).toBeGreaterThan(0);
    fireEvent.click(view.getByRole("tab", { name: "Atleti" }));
    expect(view.getAllByText("???").length).toBeGreaterThan(0);
  });

  it("lists only the athletes in the current official qualification", () => {
    const { state: completed, result } = createCompletedTournamentState();
    const qualifiedContacts = completed.contacts
      .filter((contact) => contact.status === "enrolled")
      .slice(0, 2);
    const state = {
      ...completed,
      tournaments: {
        ...completed.tournaments,
        qualification: {
          level: "academy" as const,
          season: result.season,
          contactIds: qualifiedContacts.map((contact) => contact.id),
        },
      },
    };
    const { container } = render(<TournamentsView state={state} />);
    const qualifiedTeam = within(container.querySelector<HTMLElement>(".qualified-team")!);

    expect(qualifiedTeam.getByText("2 atleti")).toBeVisible();
    qualifiedContacts.forEach((contact) => {
      expect(qualifiedTeam.getByText(`${contact.firstName} ${contact.lastName}`)).toBeVisible();
    });
    expect(container.querySelectorAll(".qualified-team-list > div")).toHaveLength(2);
  });

  it("explains a missing National qualification and removes delegation form", () => {
    const initial = createStateWithForms(64);
    const simulation = simulateTournament(
      initial,
      "academy",
      1,
      181_000,
      getEligibleSchoolContacts(initial),
    );
    const state = {
      ...initial,
      tournaments: {
        ...initial.tournaments,
        results: [simulation.result],
        qualification: undefined,
      },
    };
    const { container } = render(<TournamentsView state={state} />);
    const qualifiedTeam = within(container.querySelector<HTMLElement>(".qualified-team")!);

    expect(qualifiedTeam.getByText("Nessun atleta qualificato per il Torneo Nazionale anno 1.")).toBeVisible();
    expect(qualifiedTeam.getByText("In attesa del prossimo Torneo Scolastico.")).toBeVisible();
    expect(within(container).queryByText("Forma della delegazione")).not.toBeInTheDocument();
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
    const athleteRow = within(athleteName.closest("tr")!);
    const arena = athleteRow.getByText("143.000");
    const style = athleteRow.getByText("71.500");

    expect(arena).toHaveClass("official-stat-value");
    expect(arena.style.getPropertyValue("--official-stat-from")).toBe("var(--official-stat-100)");
    expect(arena.style.getPropertyValue("--official-stat-to")).toBe("var(--official-stat-150)");
    expect(style).toHaveClass("official-stat-value");
    expect(style.style.getPropertyValue("--official-stat-from")).toBe("var(--official-stat-50)");
    expect(style.style.getPropertyValue("--official-stat-to")).toBe("var(--official-stat-100)");
    expect(athleteRow.getByText("10", { exact: true })).toBeVisible();
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
    const athleteRow = within(view.getByText(`${target.firstName} ${target.lastName}`).closest("tr")!);
    const preparedStats = athleteRow.getAllByText("176.000");

    expect(preparedStats).toHaveLength(2);
    preparedStats.forEach((stat) => {
      expect(stat.style.getPropertyValue("--official-stat-from")).toBe("var(--official-stat-150)");
      expect(stat.style.getPropertyValue("--official-stat-to")).toBe("var(--official-stat-200)");
    });
  });

  it("opens a completed tournament directly from the calendar", () => {
    const { state, result } = createCompletedTournamentState();
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("button", {
      name: `Apri i risultati di Torneo Scolastico, stagione ${result.season}`,
    }));

    expect(view.getByRole("tab", { name: "Risultati" })).toHaveAttribute("aria-selected", "true");
    expect(view.getByText("Gironi")).toBeVisible();
    expect(view.getByText("Eliminazione diretta")).toBeVisible();
    expect(view.getByText("Podio e qualificazioni")).toBeVisible();
  });

  it("renders real group standings, bracket and podiums", () => {
    const { state } = createCompletedTournamentState();
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));

    expect(view.getByRole("table", { name: "" })).toBeVisible();
    expect(view.getByRole("heading", { name: "Eliminazione diretta" })).toBeVisible();
    expect(container.querySelectorAll(".bracket-match").length).toBeGreaterThan(0);
    expect(view.getByText("Arena", { selector: ".results-podium-list > strong" })).toBeVisible();
    expect(view.getByText("Stile", { selector: ".results-podium-list > strong" })).toBeVisible();
  });

  it("shows the detailed rewards received by the school", () => {
    const { state: completed, result } = createCompletedTournamentState();
    const podiumEntry = result.arenaPodium[0];
    const state = {
      ...completed,
      tournaments: {
        ...completed.tournaments,
        results: [{
          ...result,
          rewards: [{
            discipline: podiumEntry.discipline,
            position: podiumEntry.position,
            euros: 500,
            contacts: 10,
          }],
        }],
      },
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));

    expect(view.getByRole("heading", { name: "Premi ricevuti" })).toBeVisible();
    const rewardList = within(container.querySelector(".tournament-reward-list")!);
    expect(rewardList.getByText(/500,00/)).toBeVisible();
    expect(rewardList.getByText("10 contatti casuali")).toBeVisible();
    expect(rewardList.getByText("1° posto")).toBeVisible();
  });

  it("shows the third-place match below the final and opens its detail", () => {
    const { state, result } = createCompletedTournamentState();
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);
    const bronzeMatch = result.matches.find((match) => match.stage === "bronze")!;
    const participantById = new Map(result.participants.map((participant) => [participant.id, participant]));
    const a = participantById.get(bronzeMatch.participantAId)!;
    const b = participantById.get(bronzeMatch.participantBId)!;
    const matchLabel = `${a.firstName} ${a.lastName} ${bronzeMatch.arenaScoreA} a ${bronzeMatch.arenaScoreB} ${b.firstName} ${b.lastName}`;

    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));
    const bronzeButton = view.getByRole("button", { name: matchLabel });
    fireEvent.click(bronzeButton);

    expect(view.getByRole("heading", { name: "3° / 4° posto" })).toBeVisible();
    expect(bronzeButton).toHaveClass("bronze-bracket-match", "selected");
    const detail = container.querySelector<HTMLElement>(".selected-match-detail")!;
    expect(within(detail).getByText(`${a.firstName} ${a.lastName}`)).toBeVisible();
    expect(within(detail).getByText(`${b.firstName} ${b.lastName}`)).toBeVisible();
  });

  it("orders knockout matches by the branch they feed and draws complete connectors", () => {
    const { state, result } = createCompletedTournamentState();
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));
    const finalMatch = result.matches.find((match) => match.stage === "final")!;
    const semifinalMatches = result.matches.filter((match) => match.stage === "semifinal");
    const expectedSemifinalOrder = [finalMatch.participantAId, finalMatch.participantBId]
      .map((participantId) => semifinalMatches.find((match) => match.winnerId === participantId)!);
    const participantById = new Map(result.participants.map((participant) => [participant.id, participant]));
    const expectedLabels = expectedSemifinalOrder.map((match) => {
      const a = participantById.get(match.participantAId)!;
      const b = participantById.get(match.participantBId)!;
      return `${a.firstName} ${a.lastName} ${match.arenaScoreA} a ${match.arenaScoreB} ${b.firstName} ${b.lastName}`;
    });
    const renderedLabels = [...container.querySelectorAll(".stage-semifinal .bracket-match")]
      .map((match) => match.getAttribute("aria-label"));

    expect(renderedLabels).toEqual(expectedLabels);
    expect(container.querySelectorAll(".bracket-connectors path").length).toBeGreaterThan(0);
  });

  it("shows every knockout round and includes all group qualifiers in the round of 32", () => {
    const initial = createStateWithForms(64);
    const simulation = simulateTournament(
      initial,
      "academy",
      1,
      181_000,
      getEligibleSchoolContacts(initial),
    );
    const state = {
      ...initial,
      tournaments: { ...initial.tournaments, results: [simulation.result] },
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));
    const qualifiedIds = new Set(
      simulation.result.groupStandings
        .filter((standing) => standing.qualified)
        .map((standing) => standing.participantId),
    );
    const roundOf32ParticipantIds = new Set(
      simulation.result.matches
        .filter((match) => match.stage === "round32")
        .flatMap((match) => [match.participantAId, match.participantBId]),
    );

    expect(qualifiedIds.size).toBe(32);
    expect(roundOf32ParticipantIds).toEqual(qualifiedIds);
    expect(container.querySelector(".stage-round32")).toBeVisible();
    expect(container.querySelector(".stage-round16")).toBeVisible();
    expect(view.getByRole("heading", { name: "Sedicesimi" })).toBeVisible();
    expect(view.getByRole("heading", { name: "Ottavi" })).toBeVisible();
  });

  it("filters athletes and opens qualified athletes from results", () => {
    const { state: completed, result } = createCompletedTournamentState();
    const qualifiedContactIds = completed.contacts
      .filter((contact) => contact.status === "enrolled")
      .slice(0, 2)
      .map((contact) => contact.id);
    const state = {
      ...completed,
      tournaments: {
        ...completed.tournaments,
        qualification: {
          level: "academy" as const,
          season: result.season,
          contactIds: qualifiedContactIds,
        },
        immuneContactIds: qualifiedContactIds,
      },
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));
    fireEvent.click(view.getByRole("button", { name: "Vedi qualificati" }));

    expect(view.getByRole("tab", { name: "Atleti" })).toHaveAttribute("aria-selected", "true");
    expect(view.getByRole("combobox", { name: "Qualificazione" })).toHaveValue("qualified");
    expect(container.querySelectorAll(".athlete-table tbody tr")).toHaveLength(2);
  });

  it("highlights school athletes in the podium and group table", () => {
    const { state, result } = createCompletedTournamentState();
    const ownedParticipant = result.participants.find((participant) => participant.ownedContactId)!;
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));

    expect(view.getAllByText(`${ownedParticipant.firstName} ${ownedParticipant.lastName}`).length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".group-table tr.is-owned").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".results-podium-list span.is-owned").length).toBeGreaterThan(0);
  });
});
