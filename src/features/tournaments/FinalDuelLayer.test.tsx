import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

    const initial = createInitialState(10_000);
    const state: GameState = { ...initial, tournaments: { ...initial.tournaments, results: [result(true)] } };
    expect(selectDayNotifications(state, 70_000)).toContainEqual(
      expect.objectContaining({ finalResultId: "national-83" }),
    );
    // No spoiler: the winners stay hidden until the final is watched.
    expect(selectDayNotifications(state, 70_000).find((n) => n.finalResultId)?.detail).toBe("");
  });

  it("plays the final, closes with Esc or Chiudi and leads to the results", () => {
    const onClose = vi.fn();
    const onShowResults = vi.fn();
    render(<FinalDuelLayer result={result(true)} onClose={onClose} onShowResults={onShowResults} />);

    expect(screen.getByRole("dialog", { name: "Finale" })).toBeVisible();
    expect(screen.getByText("La tua scuola")).toBeVisible();
    expect(screen.getAllByText(/^OH a .* · punto a /)).toHaveLength(3);
    expect(screen.getByText("Niccolò Prova vince la finale 2 a 1")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Mostra i risultati" }));
    expect(onShowResults).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
