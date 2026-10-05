import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { GameState, TournamentParticipant, TournamentResult } from "../../game/types";
import { selectDayNotifications } from "../day-panel/dayNotifications";
import { getAssaultSequence, getOwnedFinal } from "./finalDuel";
import { FinalDuelLayer } from "./FinalDuelLayer";

afterEach(cleanup);

function participant(id: string, firstName: string, owned: boolean): TournamentParticipant {
  return {
    id,
    ...(owned ? { ownedContactId: `contact-${id}` } : {}),
    firstName,
    lastName: "Prova",
    schoolName: owned ? "Ordine delle Onde" : "Ordine di Minerva",
    city: "Genova",
    rarity: "rare",
    numericForms: 4,
    experience: 1,
    arenaBase: 300,
    styleBase: 300,
    arenaPreparation: 1_200,
    stylePreparation: 1_100,
    condition: 1,
  };
}

function result(ownedFinalist: boolean, completedAt = 70_000): TournamentResult {
  return {
    id: "national-83",
    level: "national",
    season: 83,
    completedAt,
    participants: [participant("a", "Niccolò", ownedFinalist), participant("b", "Giulia", false)],
    matches: [{
      id: "match-final-0-42",
      stage: "final",
      participantAId: "a",
      participantBId: "b",
      arenaScoreA: 2,
      arenaScoreB: 1,
      styleScoreA: 7.8,
      styleScoreB: 7.1,
      winnerId: "a",
    }],
    groupStandings: [],
    arenaRanking: ["a", "b"],
    styleRanking: ["a", "b"],
    arenaPodium: [],
    stylePodium: [],
    qualifiers: [],
    rewards: [],
    secretLegendaryDefeatedIds: [],
  };
}

describe("Guarda la finale (4.3)", () => {
  it("offers the final only when one of our athletes fought it", () => {
    expect(getOwnedFinal(result(true))?.a.firstName).toBe("Niccolò");
    expect(getOwnedFinal(result(false))).toBeUndefined();
    const sequence = getAssaultSequence(result(true).matches[0]);
    expect(sequence).toHaveLength(3);
    expect(sequence.at(-1)).toBe("a");
    expect(sequence.filter((side) => side === "b")).toHaveLength(1);
    expect(getAssaultSequence({ ...result(true).matches[0], assaults: "abbaa" })).toEqual(["a", "b", "b", "a", "a"]);

    const initial = createInitialState(10_000);
    const state: GameState = { ...initial, tournaments: { ...initial.tournaments, results: [result(true)] } };
    expect(selectDayNotifications(state, 70_000)).toContainEqual(
      expect.objectContaining({ finalResultId: "national-83" }),
    );
    // No spoiler: the winners stay hidden until the final is watched.
    expect(selectDayNotifications(state, 70_000).find((n) => n.finalResultId)?.detail).toBe("");
  });

  it("Outlook: a static report with «OH!» su, Servizio filled in and the codes", () => {
    document.documentElement.dataset.theme = "light";
    const base = result(true);
    const withJudges: TournamentResult = {
      ...base,
      matches: [{
        ...base.matches[0],
        styleScoreA: 7.45,
        styleScoreB: 6.38,
        styleDetailA: {
          sheets: [
            [2, 2.5, 2.5, 0, 0, 2.5, 0, 1, 0],
            [2, 2.5, 2.5, 0, 0, 2, 0, 1, 0],
          ],
        },
        stylePenaltyB: "declaration",
      }],
    };
    render(<FinalDuelLayer result={withJudges} onClose={vi.fn()} />);

    expect(screen.getAllByText(/· «OH!» su /)).toHaveLength(3);
    expect(screen.getByText("qg19z1")).toBeVisible();
    expect(screen.getByText("tg18z1")).toBeVisible();
    expect(screen.getByText("7,45")).toBeVisible();
    expect(screen.getByText(/Cartellino di Stile a/).textContent).toMatch(/Giulia Prova · Dichiarazione · −0,5/);
    expect(screen.getByText("Niccolò Prova vince la finale 2 a 1")).toBeVisible();
    expect(document.querySelector(".fd-arena")).toBeNull();
    delete document.documentElement.dataset.theme;
  });

  it("Onde: the fight plays out in Arena and ends within 30 seconds", () => {
    vi.useFakeTimers();
    const base = result(true);
    const bestOfFive: TournamentResult = {
      ...base,
      matches: [{ ...base.matches[0], arenaScoreA: 3, arenaScoreB: 2, assaults: "ababa" }],
    };
    render(<FinalDuelLayer result={bestOfFive} onClose={vi.fn()} />);
    expect(document.querySelector(".fd-arena")).not.toBeNull();
    expect(screen.getByText("al meglio dei 5")).toBeVisible();
    expect(screen.queryByText(/vince la finale/)).toBeNull();
    act(() => vi.advanceTimersByTime(30_000));
    expect(screen.getByText("Niccolò Prova vince la finale 3 a 2")).toBeVisible();
    vi.useRealTimers();
  });

  it("closes with Esc or Chiudi and leads to the results", () => {
    const onClose = vi.fn();
    const onShowResults = vi.fn();
    render(<FinalDuelLayer result={result(true)} onClose={onClose} onShowResults={onShowResults} />);

    expect(screen.getByRole("dialog", { name: "Finale" })).toBeVisible();
    expect(screen.getByText("La tua scuola")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Mostra i risultati" }));
    expect(onShowResults).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
