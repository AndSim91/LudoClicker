import { describe, expect, it } from "vitest";
import type { TournamentMatch, TournamentParticipant, TournamentResult } from "../../game/types";
import { summarizeTournament } from "./tournamentRecap";

const athlete = (id: string, owned: boolean): TournamentParticipant => ({
  id, ...(owned ? { ownedContactId: `c-${id}` } : {}), firstName: id, lastName: "X", schoolName: owned ? "Ordine delle Onde" : "Ordine del Ronin",
  city: "Genova", rarity: "common", numericForms: 2, experience: 0, arenaBase: 1, styleBase: 1, arenaPreparation: 1, stylePreparation: 1, condition: 1,
});
const match = (id: string, stage: TournamentMatch["stage"], a: string, b: string, winnerId: string) =>
  ({ id, stage, participantAId: a, participantBId: b, arenaScoreA: 2, arenaScoreB: 0, styleScoreA: 6, styleScoreB: 6, winnerId }) as TournamentMatch;

describe("summarizeTournament", () => {
  it("finds where our best athletes stopped in Arena and in Style", () => {
    const result = {
      id: "r", level: "academy", season: 2, completedAt: 1,
      participants: [athlete("ours1", true), athlete("ours2", true), athlete("w", false), athlete("s", false)],
      matches: [match("q", "quarterfinal", "ours1", "w", "w"), match("f", "final", "w", "s", "w")],
      groupStandings: [
        { groupIndex: 0, participantId: "ours1", qualified: true },
        { groupIndex: 0, participantId: "ours2", qualified: false },
      ],
      arenaRanking: ["w", "s", "ours1", "ours2"],
      styleRanking: ["s", "ours2", "w", "ours1"],
      arenaPodium: [{ participantId: "w", position: 1, discipline: "arena", score: 0 }],
      stylePodium: [
        { participantId: "s", position: 1, discipline: "style", score: 6.5 },
        { participantId: "ours2", position: 2, discipline: "style", score: 6.48 },
      ],
      qualifiers: [{ participantId: "ours2", ownedContactId: "c-ours2", source: "style", rankingPosition: 2, repechage: false }],
      rewards: [], secretLegendaryDefeatedIds: [],
    } as unknown as TournamentResult;

    const summary = summarizeTournament(result);
    expect(summary.arena).toMatchObject({ label: "Quarti", participantId: "ours1", podium: false });
    expect(summary.style).toMatchObject({ label: "2° posto", participantId: "ours2", podium: true, styleScore: 6.48 });
    expect(summary).toMatchObject({ ownedCount: 2, allOwned: false, pastGroups: 1, onPodium: 1, arenaWinnerId: "w", styleWinnerId: "s" });
    expect(summary.ownedQualifierIds).toEqual(["ours2"]);
  });
});
