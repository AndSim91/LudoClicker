import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import {
  LIGHT_INFLATION_CAUSES,
  LIGHT_INFLATION_EVENT_TITLE,
  LIGHT_INFLATION_EVENT_VISIBILITY_MS,
} from "../../game/lightInflation";
import type { ContactStatus, GameState, TournamentResult } from "../../game/types";
import { DAY_PANEL_MEDIA_QUERY, DayPanel } from "./DayPanel";
import {
  DAY_TRIAL_GROUPING_UNLOCK_MEMBERS,
  DAY_TRIAL_NOTIFICATION_LIMIT,
} from "./dayNotifications";

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

function stateWithScheduledTrials(count: number, tutorialTrialIndex?: number): GameState {
  const initial = createInitialState(10_000);
  const contacts = Array.from({ length: count }, (_, index) => ({
    ...initial.contacts[0],
    id: `day-panel-contact-${index}`,
    firstName: "Atleta",
    lastName: String(index + 1),
    status: "trialScheduled" as const,
  }));
  return {
    ...initial,
    contacts,
    scheduledTrials: contacts.map((contact, index) => ({
      id: `day-panel-trial-${index}`,
      contactId: contact.id,
      startsAt: 20_000 + index,
      resolvesAt: 50_000 + index,
      resultSeed: index,
      status: "scheduled" as const,
      tutorialSceneId: index === tutorialTrialIndex ? "first-event" as const : undefined,
    })),
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

function stateWithLightInflationEvent(occurredAt: number, visibleUntil: number): GameState {
  const initial = createInitialState(1_000);
  return {
    ...initial,
    lightInflation: {
      ...initial.lightInflation,
      event: {
        cause: LIGHT_INFLATION_CAUSES[0],
        increase: 0.1,
        occurredAt,
        visibleUntil,
      },
    },
  };
}

function stubDayPanelMediaQuery(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    media: DAY_PANEL_MEDIA_QUERY,
    get matches() {
      return matches;
    },
    onchange: null,
    addEventListener: (_type: "change", listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: "change", listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    },
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  } as MediaQueryList;
  vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));

  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      const event = { matches, media: DAY_PANEL_MEDIA_QUERY } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
    expect(screen.getByLabelText("Obiettivo breve")).toBeVisible();
    // The swords live in the title bar now (Fase 8).
    expect(screen.queryByLabelText("Gestione attrezzatura")).not.toBeInTheDocument();
  });

  it("hides wave missions when the engine marks them as inactive", () => {
    const initial = createInitialState(1_000);
    const { rerender } = render(
      <DayPanel state={{
        ...initial,
        shortGoal: { ...initial.shortGoal, isActive: false },
      }} />,
    );

    expect(screen.queryByLabelText("Obiettivo breve")).not.toBeInTheDocument();

    rerender(<DayPanel state={initial} />);

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

    expect(screen.getByText("In palestra")).toBeVisible();
  });

  it("keeps exactly five trial rows separate", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);

    render(<DayPanel state={stateWithScheduledTrials(DAY_TRIAL_NOTIFICATION_LIMIT)} />);

    expect(screen.getAllByText("Lezione di prova")).toHaveLength(5);
    expect(screen.queryByText("5 lezioni di prova")).not.toBeInTheDocument();
  });

  it("renders the ordinary group separately from Legendary trials after five members", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);
    const state = stateWithScheduledTrials(2);
    state.school = {
      ...state.school,
      activeMembers: DAY_TRIAL_GROUPING_UNLOCK_MEMBERS,
      peakActiveMembers: DAY_TRIAL_GROUPING_UNLOCK_MEMBERS,
    };
    state.contacts[1] = { ...state.contacts[1], rarity: "legendary" };

    render(<DayPanel state={state} />);

    expect(screen.getByText("1 lezione di prova")).toBeVisible();
    expect(screen.getByText("1 in programma")).toBeVisible();
    expect(screen.getAllByText("Lezione di prova")).toHaveLength(1);
    expect(screen.getByText("Atleta 2")).toHaveClass("rarity-legendary");

    const ordinaryGroup = screen.getByText("1 lezione di prova").closest(".appointment-entry");
    expect(ordinaryGroup).not.toBeNull();
    fireEvent.mouseEnter(ordinaryGroup!);
    expect(screen.getByText("Atleta 2")).toBeVisible();
  });

  it("renders one tutorial-safe summary above five trial notifications", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);

    const { container } = render(
      <DayPanel state={stateWithScheduledTrials(DAY_TRIAL_NOTIFICATION_LIMIT + 1, 0)} />,
    );

    expect(screen.getByText("6 lezioni di prova")).toBeVisible();
    expect(screen.getByText("6 in programma")).toBeVisible();
    expect(screen.getByText("00:05")).toBeVisible();
    expect(screen.queryByText("Lezione di prova")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".day-notification-trial-summary")).toHaveLength(1);
    expect(container.querySelectorAll(".day-notification-trial")).toHaveLength(0);
    expect(container.querySelector(".day-notification-trial-summary")).toHaveAttribute(
      "data-tutorial-target",
      "true",
    );
  });

  it("keeps 100 simultaneous trials condensed and updates their countdown once per second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);
    const intervalSpy = vi.spyOn(window, "setInterval");

    const { container } = render(<DayPanel state={stateWithScheduledTrials(100)} />);

    expect(DAY_TRIAL_NOTIFICATION_LIMIT).toBe(5);
    expect(screen.getByText("100 lezioni di prova")).toBeVisible();
    expect(screen.getByText("100 in programma")).toBeVisible();
    expect(container.querySelectorAll(".appointment-entry")).toHaveLength(1);
    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 1_000);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("00:04")).toBeVisible();
  });

  it("does not mount the closed panel or its clocks below the responsive breakpoint", () => {
    vi.useFakeTimers();
    vi.setSystemTime(15_000);
    const responsive = stubDayPanelMediaQuery(false);

    render(<DayPanel state={stateWithScheduledTrials(100)} />);

    expect(screen.queryByLabelText("La mia giornata")).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);

    act(() => responsive.setMatches(true));
    expect(screen.getByLabelText("La mia giornata")).toBeVisible();
    expect(screen.getByText("100 lezioni di prova")).toBeVisible();
    expect(vi.getTimerCount()).toBe(1);

    act(() => responsive.setMatches(false));
    expect(screen.queryByLabelText("La mia giornata")).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("below the breakpoint shows the open panel with a × that closes it", () => {
    stubDayPanelMediaQuery(false);
    const onClose = vi.fn();

    render(<DayPanel state={createInitialState(1_000)} open onClose={onClose} />);

    expect(screen.getByRole("complementary", { name: "La mia giornata" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Chiudi La mia giornata" }));
    expect(onClose).toHaveBeenCalledTimes(1);
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
    expect(screen.getByText("Giornata tranquilla")).toBeVisible();
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
    expect(screen.getByText("In palestra")).toBeVisible();
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

    expect(screen.getByText("Iscritto al volo")).toBeVisible();
    expect(screen.getByText(`${directMember.firstName} ${directMember.lastName}`)).toHaveClass(
      "rarity-ultra-rare",
    );
    expect(screen.getByText("Saltata la prova: ha firmato e basta.")).toBeVisible();
  });

  it("shows the tournament countdown and then its Arena and Stile winners", () => {
    vi.useFakeTimers();
    vi.setSystemTime(55_000);
    const initial = createInitialState(10_000);
    const upcomingState: GameState = {
      ...initial,
      school: {
        ...initial.school,
        currentMonth: 12,
        nextFeeAt: 60_000,
        fame: 6,
      },
      unlocks: { ...initial.unlocks, forms: true, tournaments: true },
    };

    const { rerender } = render(<DayPanel state={upcomingState} />);

    expect(screen.getByText("Torneo Scolastico in arrivo")).toBeVisible();
    expect(screen.getByText("00:05")).toBeVisible();
    const upcomingTournament = screen
      .getByText("Torneo Scolastico in arrivo")
      .closest(".appointment-entry");
    expect(upcomingTournament).toHaveClass("day-notification-tournament");
    expect(
      upcomingTournament?.querySelector(".tournament-notification-scoreboard"),
    ).toHaveTextContent("00:05Al via");
    expect(screen.getByText("Si combatte a fine mese: c'è ancora tempo per allenarsi.")).toBeVisible();

    rerender(
      <DayPanel
        state={{
          ...upcomingState,
          school: {
            ...upcomingState.school,
            currentMonth: 13,
            nextFeeAt: 120_000,
          },
          tournaments: { ...initial.tournaments, results: [tournamentResult(55_000)] },
        }}
      />,
    );

    expect(screen.getByText("Torneo Scolastico completato")).toBeVisible();
    expect(screen.queryByText("Torneo Scolastico in arrivo")).not.toBeInTheDocument();
    const completedTournament = screen
      .getByText("Torneo Scolastico completato")
      .closest(".appointment-entry");
    expect(completedTournament).toHaveClass("day-notification-tournament");
    const completedScoreboard = completedTournament?.querySelector(
      ".tournament-notification-scoreboard",
    );
    expect(completedScoreboard).toHaveTextContent("Fine");
    expect(completedScoreboard).not.toHaveTextContent("Novità");
    expect(completedTournament?.querySelector(".appointment-tournament")).toHaveAttribute(
      "aria-label",
      "Torneo Scolastico completato: Fine",
    );
    expect(completedTournament?.querySelector(".appointment-expiry")).toBeVisible();
    expect(
      screen.getByText("Vincono Ada Arena in Arena e Stella Stile nello Stile."),
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
    // An Imprevisto: red card, the definition's text and its effects as pastiglie.
    expect(screen.getByText("Imprevisto")).toBeVisible();
    expect(screen.getByText("Non so cosa sia successo, non sono stato io!")).toBeVisible();
    expect(screen.getByText("+30 usura")).toHaveClass("day-effect", "is-bad");
    expect(screen.getByText("1 spada rotta")).toHaveClass("day-effect", "is-bad");

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.queryByText("Riparazione non programmata")).not.toBeInTheDocument();
  });

  it("leaves Inflazione di Luce to its full-screen scene", () => {
    vi.useFakeTimers();
    vi.setSystemTime(55_000);
    const state = stateWithLightInflationEvent(50_000, 50_000 + LIGHT_INFLATION_EVENT_VISIBILITY_MS);

    render(<DayPanel state={state} />);

    expect(screen.queryByText(LIGHT_INFLATION_EVENT_TITLE)).not.toBeInTheDocument();
  });
});
