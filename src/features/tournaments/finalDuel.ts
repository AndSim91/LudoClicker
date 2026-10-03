import type { TournamentMatch, TournamentParticipant, TournamentResult } from "../../game/types";

export interface OwnedFinal {
  match: TournamentMatch;
  a: TournamentParticipant;
  b: TournamentParticipant;
}

/** The Arena final, only when one of the player's athletes fought it (4.3). */
export function getOwnedFinal(result: TournamentResult): OwnedFinal | undefined {
  const match = result.matches.find((candidate) => candidate.stage === "final");
  if (!match) return undefined;
  const a = result.participants.find((participant) => participant.id === match.participantAId);
  const b = result.participants.find((participant) => participant.id === match.participantBId);
  if (!a || !b || !(a.ownedContactId || b.ownedContactId)) return undefined;
  return { match, a, b };
}

/**
 * Who took each assault. The match keeps only the score (2–0 or 2–1), so the
 * loser's single point lands in the first or second assault, chosen from the
 * match id: the same final always replays the same way.
 */
export function getAssaultSequence(match: TournamentMatch): ("a" | "b")[] {
  const winner = match.winnerId === match.participantAId ? "a" : "b";
  const loser = winner === "a" ? "b" : "a";
  const loserPoints = Math.min(match.arenaScoreA, match.arenaScoreB);
  if (loserPoints === 0) return [winner, winner];
  let hash = 0;
  for (const char of match.id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return (hash & 1) === 0 ? [loser, winner, winner] : [winner, loser, winner];
}
