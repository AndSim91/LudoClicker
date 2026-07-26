import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { ContactStatus, GameState, TournamentResult } from "../../game/types";
import { DayPanel } from "./DayPanel";

function stateWithTrial(
  contactStatus: ContactStatus,
  trialStatus: "scheduled" | "completed",
): GameState {
  const initial = createInitialState(10_000);
  return {
    ...initial,
    contacts: [{ ...initial.contacts[0], status: contactStatus }, ...initial.contacts.slice(1)],
    scheduledTrials: [
      {
        id: "trial-day-panel",
        contactId: initial.contacts[0].id,
        startsAt: 20_000,
        resolvesAt: 50_000,
        resultSeed: 42,
        status: trialStatus,
      },
    ],
  };
}

function tournamentResult(completedAt: number): TournamentResult {
  const arenaWinner: TournamentResult["participants"][number] = {
    id: "arena-winner",
    ownedContactId: "contact-1",
    firstName: "Ada",
    lastName: "Arena",
    schoolName: "Ordine delle Onde",
    city: "Genova",
    rarity: "rare",
    numericForms: 2,
    experience: 1,
    arenaBase: 10,
    styleBase: 10,
    arenaPreparation: 20,
    stylePreparation: 20,
    condition: 1,
  };
  return {
    id: "tournament-day-panel",
    level: "school",
    season: 1,
    completedAt,
    participants: [
      arenaWinner,
      {
        ...arenaWinner,
        id: "style-winner",
        ownedContactId: "contact-2",
        firstName: "Stella",
        lastName: "Stile",
      },
    ],
    matches: [],
    groupStandings: [],
    arenaRanking: ["arena-winner", "style-winner"],
    styleRanking: ["style-winner", "arena-winner"],
    arenaPodium: [],
    stylePodium: [],
    qualifiers: [],
    rewards: [],
    secretLegendaryDefeatedIds: [],
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DayPanel", () => {
  it("does not start the shared clock without live notifications", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const intervalSpy = vi.spyOn(window, "setInterval");

    render(<DayPanel state={createInitialState(1_000)} />);

    expect(intervalSpy).not.toHaveBeenCalled();
  });

  it("exposes La mia giornata as a guided tutorial target", () => {
    render(<DayPanel state={createInitialState(1_000)} />);

    expect(screen.getByLabelText("La mia giornata")).toHaveAttribute(
      "data-tutorial-target",
      "true",
    );
    const mission = screen.getByLabelText("Obiettivo breve");
    const equipment = screen.getByLabelText("Gestione attrezzatura");
    expect(mission.nextElementSibling).toBe(equipment);
  });

  it("shows wave missions only below 10,000 euros", () => {
    const initial = createInitialState(1_000);
    const { rerender } = render(
      <DayPanel state={{ ...initial, school: { ...initial.school, euros: 10_000 } }} />,
    );

    expect(screen.queryByLabelText("Obiettivo breve")).not.toBeInTheDocument();

    rerender(
      <DayPanel state={{ ...initial, school: { ...initial.school, euros: 9_999.99 } }} />,
    );

    expect(screen.getByLabelText("Obiettivo breve")).toBeVisible();
  });

  it("exposes only the tutorial trial row as the precise guided target", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);
    const state = stateWithTrial("trialScheduled", "scheduled");
    state.scheduledTrials[0] = {
      ...state.scheduledTrials[0],
      tutorialSceneId: "first-event",
    };

    render(<DayPanel state={state} />);

    const trialRow = screen.getByLabelText(/Lezione di prova/).closest(".appointment-entry");
    expect(trialRow).toHaveAttribute("data-tutorial-region", "first-trial-row");
    expect(trialRow).toHaveAttribute("data-tutorial-target", "true");
  });

  it("does not show the current date under the heading", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);

    const { container } = render(<DayPanel state={createInitialState(10_000)} />);

    expect(container.querySelector(".today")).not.toBeInTheDocument();
  });

  it("replaces the appointment time with a live countdown", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);

    render(<DayPanel state={stateWithTrial("trialScheduled", "scheduled")} />);

    expect(screen.getByText("00:05")).toBeVisible();
  });

  it("shows that the lesson is in progress after it starts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(25_000);

    render(<DayPanel state={stateWithTrial("trialScheduled", "scheduled")} />);

    expect(screen.getByText("In corso…")).toBeVisible();
  });

  it("colors the attendee name according to their rarity", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);
    const state = stateWithTrial("trialScheduled", "scheduled");
    const contact = state.contacts[0];
    state.contacts[0] = { ...contact, rarity: "rare" };

    render(<DayPanel state={state} />);

    expect(screen.getByText(`${contact.firstName} ${contact.lastName}`)).toHaveClass(
      "rarity-name",
      "rarity-rare",
    );
  });

  it.each([
    ["enrolled", "Iscritto", "appointment-enrolled"],
    ["lost", "Non iscritto", "appointment-lost"],
  ] as const)("shows the %s outcome with its row color", (contactStatus, label, className) => {
    vi.useFakeTimers();
    vi.setSystemTime(55_000);

    render(<DayPanel state={stateWithTrial(contactStatus, "completed")} />);

    expect(screen.getByText(label).closest(".appointment")).toHaveClass(className);
    expect(screen.getByRole("progressbar", { name: /Tempo residuo/ })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    expect(screen.getByRole("progressbar", { name: /Tempo residuo/ })).toHaveAttribute(
      "aria-valuetext",
      "5 secondi rimanenti",
    );
  });

  it.each([
    ["enrolled", "Iscritto"],
    ["lost", "Non iscritto"],
  ] as const)("dismisses the %s outcome when its expiry bar ends", (contactStatus, label) => {
    vi.useFakeTimers();
    vi.setSystemTime(55_000);

    render(<DayPanel state={stateWithTrial(contactStatus, "completed")} />);

    expect(screen.getByText(label)).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.queryByText(label)).not.toBeInTheDocument();
    expect(screen.getByText("Nessuna attività in corso")).toBeVisible();
  });

  it("pauses a trial countdown while hovering its notification", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);

    render(<DayPanel state={stateWithTrial("trialScheduled", "scheduled")} />);

    const trialRow = screen.getByText("00:05").closest(".appointment-entry");
    expect(trialRow).not.toBeNull();
    fireEvent.mouseEnter(trialRow!);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByText("00:05")).toBeVisible();

    fireEvent.mouseLeave(trialRow!);
    expect(screen.getByText("In corso…")).toBeVisible();
  });

  it("pauses a notification expiry bar while hovering its notification", () => {
    vi.useFakeTimers();
    vi.setSystemTime(55_000);

    render(<DayPanel state={stateWithTrial("enrolled", "completed")} />);

    const notificationRow = screen.getByText("Iscritto").closest(".appointment-entry");
    expect(notificationRow).not.toBeNull();
    fireEvent.mouseEnter(notificationRow!);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByText("Iscritto")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: /Tempo residuo/ })).toHaveAttribute(
      "aria-valuetext",
      "5 secondi rimanenti",
    );

    fireEvent.mouseLeave(notificationRow!);
    expect(screen.queryByText("Iscritto")).not.toBeInTheDocument();
  });

  it("shows an athlete enrolled without a trial", () => {
    vi.useFakeTimers();
    vi.setSystemTime(55_000);
    const initial = createInitialState(10_000);
    const directMember = {
      ...initial.contacts[0],
      acquiredAt: 50_000,
      status: "enrolled" as const,
      rarity: "ultra-rare" as const,
    };

    render(
      <DayPanel state={{ ...initial, contacts: [directMember, ...initial.contacts.slice(1)] }} />,
    );

    expect(screen.getByText("Iscrizione diretta")).toBeVisible();
    expect(screen.getByText(`${directMember.firstName} ${directMember.lastName}`)).toHaveClass(
      "rarity-ultra-rare",
    );
    expect(screen.getByText("Nuovo atleta entrato senza lezione di prova")).toBeVisible();
  });

  it("shows the Arena and Stile winners for a completed school tournament", () => {
    vi.useFakeTimers();
    vi.setSystemTime(55_000);
    const initial = createInitialState(10_000);

    render(
      <DayPanel
        state={{
          ...initial,
          tournaments: { ...initial.tournaments, results: [tournamentResult(50_000)] },
        }}
      />,
    );

    expect(screen.getByText("Torneo Scolastico completato")).toBeVisible();
    expect(
      screen.getByText("1° posto Arena: Ada Arena | 1° posto Stile: Stella Stile"),
    ).toBeVisible();
  });

  it("shows important events and lets their notification expire", () => {
    vi.useFakeTimers();
    vi.setSystemTime(55_000);
    const initial = createInitialState(10_000);
    const state: GameState = {
      ...initial,
      narrative: {
        ...initial.narrative,
        history: [
          {
            id: "story-day-panel",
            definitionId: "unexpected-repair",
            title: "Riparazione non programmata",
            occurredAt: 50_000,
            summary: "Una spada richiede ricambi.",
          },
        ],
      },
    };

    render(<DayPanel state={state} />);

    expect(screen.getByText("Riparazione non programmata")).toBeVisible();
    expect(screen.getByText("Una spada richiede ricambi.")).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.queryByText("Riparazione non programmata")).not.toBeInTheDocument();
  });
});
