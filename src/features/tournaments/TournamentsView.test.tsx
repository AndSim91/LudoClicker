import { act, fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FORM_DEFINITIONS } from "../../content/forms";
import { addAdminMembers } from "../../game/adminFlow";
import { createInitialState } from "../../game/engine";
import { getEligibleSchoolContacts, simulateTournament } from "../../game/tournamentSimulation";
import "../../styles/tournaments.css";
import { TournamentsView } from "./TournamentsView";

function createStateWithForms(memberCount = 6) {
  const initial = createInitialState(1_000, "Manager");
  const enrolled = addAdminMembers(initial, memberCount);
  return {
    ...enrolled,
    contacts: enrolled.contacts.map((contact) =>
      contact.status === "enrolled" ? { ...contact, forms: ["form-1" as const] } : contact,
    ),
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
      school: { ...state.school, currentMonth: 12 },
      tournaments: {
        ...state.tournaments,
        results: [simulation.result],
        qualification: {
          level: "academy" as const,
          season: simulation.result.season,
          contactIds: simulation.result.qualifiers.flatMap((qualifier) =>
            qualifier.ownedContactId ? [qualifier.ownedContactId] : [],
          ),
        },
      },
    },
    result: simulation.result,
  };
}

describe("TournamentsView", () => {
  it("shows the tournament overview without duplicating the athletes page", () => {
    const state = createStateWithForms();
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    expect(view.getByText("Calendario della stagione")).toBeVisible();
    expect(view.getByText("6 iscritti")).toBeVisible();
    expect(view.getByText("al Torneo Scolastico")).toBeVisible();
    expect(view.queryByRole("tab", { name: "Atleti" })).not.toBeInTheDocument();
  });

  it("shows aggregate preliminaries when more than 64 athletes are eligible", () => {
    const state = createStateWithForms(80);
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    expect(view.getByText("64 convocati")).toBeVisible();
    expect(view.getByText("su 80 idonei · preliminari aggregate")).toBeVisible();
    expect(view.queryByText("80 iscritti")).not.toBeInTheDocument();
  });

  it("keeps the preliminary population in the completed tournament result", () => {
    const initial = createStateWithForms(80);
    const simulation = simulateTournament(
      initial,
      "school",
      1,
      181_000,
      getEligibleSchoolContacts(initial),
    );
    const legacyResult = {
      ...simulation.result,
      participants: simulation.result.participants.map((participant) => {
        const legacyParticipant = { ...participant };
        delete legacyParticipant.knownFormIds;
        return legacyParticipant;
      }),
    };
    const crowdedContactId = legacyResult.schoolPreliminary?.arenaSelectedContactIds[0];
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) =>
        contact.id === crowdedContactId
          ? { ...contact, forms: FORM_DEFINITIONS.map((definition) => definition.id) }
          : contact,
      ),
      tournaments: { ...initial.tournaments, results: [legacyResult] },
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));

    expect(view.getByText("64 partecipanti")).toBeVisible();
    expect(view.getByText("80 idonei alle preliminari")).toBeVisible();

    const preliminaryTab = view.getByRole("tab", { name: "Preliminari, 80 idonei" });
    expect(preliminaryTab).toHaveAttribute("aria-selected", "false");
    fireEvent.click(preliminaryTab);

    expect(preliminaryTab).toHaveAttribute("aria-selected", "true");
    const summary = within(view.getByRole("region", { name: "Risultati delle preliminari" }));
    expect(summary.getByText("80")).toBeVisible();
    expect(summary.getByText("64")).toBeVisible();
    expect(summary.getByText("16")).toBeVisible();
    const arenaRanking = view.getByRole("region", { name: "Qualificati per Arena" });
    const styleRanking = view.getByRole("region", { name: "Qualificati per Stile" });
    expect(arenaRanking.querySelectorAll("tbody tr")).toHaveLength(32);
    expect(styleRanking.querySelectorAll("tbody tr")).toHaveLength(32);
    expect(within(arenaRanking).getByRole("columnheader", { name: /Rarit/ })).toBeVisible();
    expect(within(arenaRanking).getByRole("columnheader", { name: "Forme" })).toBeVisible();
    expect(within(arenaRanking).getByRole("columnheader", { name: "Arena" })).toBeVisible();
    expect(
      within(arenaRanking).queryByRole("columnheader", { name: "Stile" }),
    ).not.toBeInTheDocument();
    expect(within(styleRanking).getByRole("columnheader", { name: "Stile" })).toBeVisible();
    expect(
      within(styleRanking).queryByRole("columnheader", { name: "Arena" }),
    ).not.toBeInTheDocument();
    expect(arenaRanking.querySelectorAll(".preliminary-rarity")).toHaveLength(32);
    expect(arenaRanking).toHaveStyle("--preliminary-form-columns: 8");
    expect(arenaRanking.querySelectorAll(".preliminary-forms img")).toHaveLength(46);
    expect(within(arenaRanking).queryByText(/15 Forme/)).not.toBeInTheDocument();
    expect(view.queryByRole("heading", { name: "Gironi" })).not.toBeInTheDocument();

    fireEvent.click(view.getByRole("tab", { name: "Torneo" }));
    expect(view.getByRole("heading", { name: "Gironi" })).toBeVisible();
    expect(container.querySelector(".result-qualifiers small"))
      .toHaveTextContent("6 posti disponibili con 80 iscritti attivi");
  });

  it("shows a qualified absence as a bye without listing the departed athlete", () => {
    const { state: completed, result } = createCompletedTournamentState();
    const qualifiedContacts = completed.contacts
      .filter((contact) => contact.status === "enrolled")
      .slice(0, 2);
    const departed = qualifiedContacts[0];
    const active = qualifiedContacts[1];
    const state = {
      ...completed,
      contacts: completed.contacts.map((contact) =>
        contact.id === departed.id ? { ...contact, status: "departed" as const } : contact,
      ),
      school: { ...completed.school, activeMembers: completed.school.activeMembers - 1 },
      tournaments: {
        ...completed.tournaments,
        qualification: {
          level: "academy" as const,
          season: result.season,
          contactIds: qualifiedContacts.map((contact) => contact.id),
          slotCount: 6 as const,
          activeMembersAtQualification: 6,
        },
      },
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    expect(view.getByText("1 qualificato")).toBeVisible();
    expect(view.getByText("al Torneo Accademico Alpha · 1 bye")).toBeVisible();
    expect(view.getByText("1 atleta · 1 bye")).toBeVisible();
    expect(view.getByText(`${active.firstName} ${active.lastName}`)).toBeVisible();
    expect(view.queryByText(`${departed.firstName} ${departed.lastName}`)).not.toBeInTheDocument();
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

    expect(
      qualifiedTeam.getByText("Nessun atleta qualificato per il Torneo Nazionale anno 1."),
    ).toBeVisible();
    expect(qualifiedTeam.getByText("In attesa del prossimo Torneo Scolastico.")).toBeVisible();
    expect(within(container).queryByText("Forma della delegazione")).not.toBeInTheDocument();
  });

  it("opens a completed tournament directly from the calendar", () => {
    const { state, result } = createCompletedTournamentState();
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(
      view.getByRole("button", {
        name: `Apri i risultati di Torneo Scolastico, stagione ${result.season}`,
      }),
    );

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
        results: [
          {
            ...result,
            rewards: [
              {
                discipline: podiumEntry.discipline,
                position: podiumEntry.position,
                euros: 500,
                contacts: 10,
              },
            ],
          },
        ],
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
    const participantById = new Map(
      result.participants.map((participant) => [participant.id, participant]),
    );
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
    const expectedSemifinalOrder = [finalMatch.participantAId, finalMatch.participantBId].map(
      (participantId) => semifinalMatches.find((match) => match.winnerId === participantId)!,
    );
    const participantById = new Map(
      result.participants.map((participant) => [participant.id, participant]),
    );
    const expectedLabels = expectedSemifinalOrder.map((match) => {
      const a = participantById.get(match.participantAId)!;
      const b = participantById.get(match.participantBId)!;
      return `${a.firstName} ${a.lastName} ${match.arenaScoreA} a ${match.arenaScoreB} ${b.firstName} ${b.lastName}`;
    });
    const renderedLabels = [...container.querySelectorAll(".stage-semifinal .bracket-match")].map(
      (match) => match.getAttribute("aria-label"),
    );

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

  it("opens the official athletes page from results", () => {
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
    const onOpenAthletes = vi.fn();
    const { container } = render(<TournamentsView state={state} onOpenAthletes={onOpenAthletes} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));
    fireEvent.click(view.getByRole("button", { name: "Vedi qualificati" }));

    expect(onOpenAthletes).toHaveBeenCalledTimes(1);
    expect(view.queryByRole("tab", { name: "Atleti" })).not.toBeInTheDocument();
  });

  it("highlights school athletes in the podium and group table", () => {
    const { state, result } = createCompletedTournamentState();
    const ownedParticipant = result.participants.find((participant) => participant.ownedContactId)!;
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Risultati" }));

    expect(
      view.getAllByText(`${ownedParticipant.firstName} ${ownedParticipant.lastName}`).length,
    ).toBeGreaterThan(0);
    expect(container.querySelectorAll(".group-table tr.is-owned").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".results-podium-list span.is-owned").length).toBeGreaterThan(
      0,
    );
  });

  it("shows the actual qualified athletes without treating a smaller team as incomplete", () => {
    const initial = createStateWithForms();
    const qualifiedContactIds = initial.contacts
      .filter((contact) => contact.status === "enrolled")
      .slice(0, 5)
      .map((contact) => contact.id);
    const state = {
      ...initial,
      school: { ...initial.school, currentMonth: 18 },
      tournaments: {
        ...initial.tournaments,
        qualification: {
          level: "national" as const,
          season: 1,
          contactIds: qualifiedContactIds,
        },
      },
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    expect(view.getByText("5 qualificati")).toBeVisible();
    expect(view.getByText("al Torneo Nazionale")).toBeVisible();
    expect(view.queryByText("Delegazione incompleta")).not.toBeInTheDocument();
    expect(view.queryByText("5/6")).not.toBeInTheDocument();
  });

  it("does not show a previous season result as completed in the current calendar", () => {
    const initial = createStateWithForms();
    const oldTournament = simulateTournament(
      initial,
      "national",
      1,
      181_000,
      getEligibleSchoolContacts(initial),
    ).result;
    const qualifiedContactIds = initial.contacts
      .filter((contact) => contact.status === "enrolled")
      .slice(0, 5)
      .map((contact) => contact.id);
    const state = {
      ...initial,
      school: { ...initial.school, currentMonth: 30 },
      tournaments: {
        ...initial.tournaments,
        results: [oldTournament],
        qualification: {
          level: "national" as const,
          season: 2,
          contactIds: qualifiedContactIds,
        },
      },
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    expect(view.getByText("Torneo in arrivo")).toBeVisible();
    expect(view.queryByText("Completato · stagione 1")).not.toBeInTheDocument();
  });

  it("shows only school winners and separates each tournament by level", () => {
    const initial = createStateWithForms();
    const simulation = simulateTournament(
      initial,
      "academy",
      1,
      181_000,
      getEligibleSchoolContacts(initial),
    );
    const schoolWinner = simulation.result.participants.find(
      (participant) => participant.ownedContactId,
    )!;
    const externalWinner = simulation.result.participants.find(
      (participant) => !participant.ownedContactId,
    )!;
    const result = {
      ...simulation.result,
      arenaPodium: [
        {
          participantId: externalWinner.id,
          position: 1 as const,
          discipline: "arena" as const,
          score: 1,
        },
        {
          participantId: schoolWinner.id,
          position: 2 as const,
          discipline: "arena" as const,
          score: 2,
        },
      ],
      stylePodium: [],
    };
    const state = {
      ...initial,
      tournaments: { ...initial.tournaments, results: [result] },
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Albo d'oro" }));

    expect(view.getByRole("heading", { name: "Torneo Accademico Alpha" })).toBeVisible();
    expect(view.getByText("Livello Accademico · Stagione 1")).toBeVisible();
    expect(view.getByRole("heading", { name: "Arena" })).toBeVisible();
    expect(view.getByRole("heading", { name: "Stile" })).toBeVisible();
    expect(view.getByText(`${schoolWinner.firstName} ${schoolWinner.lastName}`)).toBeVisible();
    expect(view.getByText("Nessun vincitore della scuola")).toBeVisible();
    expect(
      view.queryByText(`${externalWinner.firstName} ${externalWinner.lastName}`),
    ).not.toBeInTheDocument();
  });

  it("keeps tournament cards at their fixed height with a long virtualized history", () => {
    const { state, result } = createCompletedTournamentState();
    const results = Array.from({ length: 24 }, (_, index) => ({
      ...result,
      id: `${result.id}-${index}`,
      season: index + 1,
    }));
    const { container } = render(
      <TournamentsView
        state={{
          ...state,
          tournaments: { ...state.tournaments, results },
        }}
      />,
    );
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Albo d'oro" }));

    const cards = container.querySelectorAll<HTMLElement>(".tournament-hall-tournament");
    expect(cards).toHaveLength(18);
    expect(getComputedStyle(cards[0]).flexShrink).toBe("0");
    expect(getComputedStyle(cards[0]).flexBasis).toBe("274px");
  });

  it("keeps Chronicles completely hidden until it is unlocked", () => {
    const { container } = render(<TournamentsView state={createStateWithForms()} />);
    const view = within(container);

    expect(view.queryByRole("tab", { name: "Chronicles" })).not.toBeInTheDocument();
    expect(view.queryByText("Chronicles of Ludosport")).not.toBeInTheDocument();
    expect(view.getByText("Calendario della stagione")).toBeVisible();
  });

  it("selects exactly six athletes and dispatches Chronicles only after five seconds", () => {
    vi.useFakeTimers();
    try {
      const initial = createStateWithForms();
      const state = {
        ...initial,
        tournaments: {
          ...initial.tournaments,
          chronicles: { unlocked: true, keys: 1 },
        },
      };
      const onStartChronicles = vi.fn();
      const { container } = render(
        <TournamentsView state={state} onStartChronicles={onStartChronicles} />,
      );
      const view = within(container);

      expect(view.getByRole("tab", { name: "Chronicles" })).toBeVisible();
      fireEvent.click(view.getByRole("tab", { name: "Chronicles" }));
      view.getAllByRole("checkbox").forEach((checkbox) => fireEvent.click(checkbox));
      expect(view.getByText("6 / 6")).toBeVisible();
      fireEvent.click(view.getByRole("button", { name: "Avvia le Chronicles" }));

      expect(view.getByRole("status")).toHaveTextContent("Il torneo è in corso");
      expect(onStartChronicles).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(4_999));
      expect(onStartChronicles).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));

      const startedIds = onStartChronicles.mock.calls[0][0];
      expect(startedIds).toHaveLength(6);
      expect(startedIds).toEqual(
        expect.arrayContaining(
          state.contacts
            .filter((contact) => contact.status === "enrolled")
            .map((contact) => contact.id),
        ),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("sorts Chronicles athletes by Arena or Style and shows ten per page", () => {
    const initial = createStateWithForms(14);
    const enrolledContacts = initial.contacts.filter((contact) => contact.status === "enrolled");
    const state = {
      ...initial,
      contacts: initial.contacts.map((contact) => {
        const index = enrolledContacts.findIndex((candidate) => candidate.id === contact.id);
        return index < 0
          ? contact
          : {
              ...contact,
              forms: ["form-1" as const, "course-x" as const],
              arenaBase: index + 1,
              styleBase: enrolledContacts.length - index,
            };
      }),
      tournaments: {
        ...initial.tournaments,
        chronicles: { unlocked: true, keys: 1 },
      },
    };
    const { container } = render(<TournamentsView state={state} />);
    const view = within(container);
    fireEvent.click(view.getByRole("tab", { name: "Chronicles" }));

    const availableRows = () => [
      ...container.querySelectorAll<HTMLElement>(".chronicles-roster-list label"),
    ];
    expect(availableRows()).toHaveLength(10);
    expect(availableRows()[0]).toHaveTextContent(
      `${enrolledContacts.at(-1)!.firstName} ${enrolledContacts.at(-1)!.lastName}`,
    );
    expect(view.getByRole("columnheader", { name: "Arena" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    fireEvent.click(view.getByRole("button", { name: "Ordina per Stile" }));
    expect(availableRows()[0]).toHaveTextContent(
      `${enrolledContacts[0].firstName} ${enrolledContacts[0].lastName}`,
    );
    fireEvent.click(view.getByRole("button", { name: "Successiva" }));
    expect(availableRows()).toHaveLength(4);
    expect(view.getByText("Pagina 2 di 2")).toBeVisible();
  });

  it("opens the themed Chronicles result inside Chronicles and returns to athlete selection", () => {
    vi.useFakeTimers();
    try {
      const initial = createStateWithForms();
      const state = {
        ...initial,
        tournaments: {
          ...initial.tournaments,
          chronicles: { unlocked: true, keys: 1 },
        },
      };
      const simulation = simulateTournament(
        state,
        "chronicles",
        1,
        181_000,
        getEligibleSchoolContacts(state),
      );
      const onStartChronicles = vi.fn();
      const { container, rerender } = render(
        <TournamentsView state={state} onStartChronicles={onStartChronicles} />,
      );
      const view = within(container);
      fireEvent.click(view.getByRole("tab", { name: "Chronicles" }));
      view.getAllByRole("checkbox").forEach((checkbox) => fireEvent.click(checkbox));
      fireEvent.click(view.getByRole("button", { name: "Avvia le Chronicles" }));

      const activePhase = () =>
        container.querySelector<HTMLElement>(".chronicles-loading-progress .is-active");
      expect(activePhase()).toHaveTextContent("Gironi");
      expect(onStartChronicles).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(1_667));
      expect(activePhase()).toHaveTextContent("Eliminazione");
      expect(onStartChronicles).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(1_667));
      expect(activePhase()).toHaveTextContent("Classifica");
      expect(onStartChronicles).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(1_665));
      expect(onStartChronicles).not.toHaveBeenCalled();
      expect(view.getByRole("status")).toBeVisible();

      act(() => vi.advanceTimersByTime(1));
      expect(onStartChronicles).toHaveBeenCalledTimes(1);
      expect(view.queryByRole("status")).not.toBeInTheDocument();
      expect(view.getByRole("tab", { name: "Chronicles" })).toHaveAttribute(
        "aria-selected",
        "true",
      );

      rerender(
        <TournamentsView
          state={{
            ...state,
            tournaments: {
              ...state.tournaments,
              results: [simulation.result],
              chronicles: { unlocked: true, keys: 0 },
            },
          }}
          onStartChronicles={onStartChronicles}
        />,
      );
      expect(view.getByRole("tab", { name: "Chronicles" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(container.querySelector(".tournament-results-view")).toHaveClass("is-chronicles");
      expect(view.getByRole("heading", { name: "Chronicles of Ludosport" })).toBeVisible();
      fireEvent.click(view.getByRole("button", { name: "Prossimo Torneo" }));
      expect(view.getByRole("heading", { name: "Atleti disponibili" })).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  it("continues from a Chronicles victory result to the Legendary final challenge", () => {
    vi.useFakeTimers();
    try {
      const initial = createStateWithForms();
      const state = {
        ...initial,
        tournaments: {
          ...initial.tournaments,
          chronicles: { unlocked: true, keys: 1 },
        },
      };
      const simulation = simulateTournament(
        state,
        "chronicles",
        1,
        181_000,
        getEligibleSchoolContacts(state),
      );
      const onStartChronicles = vi.fn();
      const { container, rerender } = render(
        <TournamentsView state={state} onStartChronicles={onStartChronicles} />,
      );
      const view = within(container);
      fireEvent.click(view.getByRole("tab", { name: "Chronicles" }));
      view.getAllByRole("checkbox").forEach((checkbox) => fireEvent.click(checkbox));
      fireEvent.click(view.getByRole("button", { name: "Avvia le Chronicles" }));
      act(() => vi.advanceTimersByTime(5_000));

      rerender(
        <TournamentsView
          state={{
            ...state,
            tournaments: {
              ...state.tournaments,
              results: [simulation.result],
              chronicles: {
                unlocked: true,
                keys: 0,
                activeChallenge: {
                  legendaryId: "enrico-giovanetti" as const,
                  tournamentResultId: simulation.result.id,
                  discipline: "arena" as const,
                  queuedDisciplines: [],
                  playerWins: 0,
                  legendaryWins: 0,
                  hands: [],
                },
              },
            },
          }}
          onStartChronicles={onStartChronicles}
        />,
      );

      expect(container.querySelector(".tournament-results-view")).toHaveClass("is-chronicles");
      fireEvent.click(view.getByRole("button", { name: "Sfida Finale" }));
      expect(view.getByRole("heading", { name: "Sfida leggendaria" })).toBeVisible();
      expect(view.getByText("Enrico Giovanetti")).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders the persistent Legendary duel and sends a hand choice", () => {
    const initial = createStateWithForms();
    const state = {
      ...initial,
      tournaments: {
        ...initial.tournaments,
        chronicles: {
          unlocked: true,
          keys: 0,
          activeChallenge: {
            legendaryId: "enrico-giovanetti" as const,
            tournamentResultId: "chronicles-1",
            discipline: "style" as const,
            queuedDisciplines: [],
            playerWins: 1,
            legendaryWins: 1,
            hands: [],
          },
        },
      },
    };
    const onPlayChroniclesHand = vi.fn();
    const { container } = render(
      <TournamentsView state={state} onPlayChroniclesHand={onPlayChroniclesHand} />,
    );
    const view = within(container);

    fireEvent.click(view.getByRole("tab", { name: "Chronicles" }));
    fireEvent.click(view.getByRole("button", { name: "Gioca Carta" }));

    expect(view.getByRole("heading", { name: "Sfida leggendaria" })).toBeVisible();
    expect(view.getByText("Enrico Giovanetti")).toBeVisible();
    expect(view.getByText("Mano decisiva")).toBeVisible();
    expect(onPlayChroniclesHand).toHaveBeenCalledWith("paper");
  });
});
