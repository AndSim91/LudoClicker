import { getNextTournamentLevel } from "../../content/tournaments";
import { getTournamentRewardFollowers } from "../../game/tournamentRewardFlow";
import type { TournamentMatch, TournamentResult } from "../../game/types";
import { knockoutStageLabel } from "./tournamentPresentation";

/** Deepest knockout stage first: where our best athlete stopped when off the podium. */
const DEEPEST_STAGE_FIRST: TournamentMatch["stage"][] = [
  "final", "bronze", "semifinal", "quarterfinal", "round16", "round32", "round64",
];

export interface OwnedBest {
  label: string;
  participantId: string;
  /** On the podium: shown in gold. */
  podium: boolean;
  styleScore?: number;
}

export interface TournamentRecapSummary {
  ownedCount: number;
  allOwned: boolean;
  pastGroups: number;
  onPodium: number;
  arena?: OwnedBest;
  style?: OwnedBest;
  arenaWinnerId?: string;
  styleWinnerId?: string;
  ownedQualifierIds: string[];
  qualifierCount: number;
  hasNextLevel: boolean;
  euros: number;
  followers: number;
}

export function qualificationDestination(level: ReturnType<typeof getNextTournamentLevel>): string {
  if (level === "academy") return "all'Accademico";
  if (level === "national") return "al Nazionale";
  if (level === "champions") return "alla Champion's Arena";
  return "complessivi";
}

/** How the school did in one tournament, for the Panoramica recap (13/10/2026). */
export function summarizeTournament(result: TournamentResult): TournamentRecapSummary {
  const owned = new Set(result.participants.flatMap((p) => (p.ownedContactId ? [p.id] : [])));
  const bestOnPodium = (podium: TournamentResult["arenaPodium"]) =>
    podium.filter((entry) => owned.has(entry.participantId)).sort((a, b) => a.position - b.position)[0];

  const arenaPodium = bestOnPodium(result.arenaPodium);
  let arena: OwnedBest | undefined = arenaPodium
    ? { label: `${arenaPodium.position}° posto`, participantId: arenaPodium.participantId, podium: true }
    : undefined;
  for (const stage of DEEPEST_STAGE_FIRST) {
    if (arena) break;
    const match = result.matches.find((m) => m.stage === stage && (owned.has(m.participantAId) || owned.has(m.participantBId)));
    if (match) {
      arena = {
        label: knockoutStageLabel[stage] ?? "",
        participantId: owned.has(match.participantAId) ? match.participantAId : match.participantBId,
        podium: false,
      };
    }
  }
  const ownedStanding = result.groupStandings.find((standing) => owned.has(standing.participantId));
  if (!arena && ownedStanding) arena = { label: "Gironi", participantId: ownedStanding.participantId, podium: false };

  const stylePodium = bestOnPodium(result.stylePodium);
  const styleIndex = result.styleRanking.findIndex((id) => owned.has(id));
  const style: OwnedBest | undefined = stylePodium
    ? { label: `${stylePodium.position}° posto`, participantId: stylePodium.participantId, podium: true, styleScore: stylePodium.score }
    : styleIndex >= 0
      ? { label: `${styleIndex + 1}° posto`, participantId: result.styleRanking[styleIndex], podium: false }
      : undefined;

  const winner = (podium: TournamentResult["arenaPodium"]) => podium.find((entry) => entry.position === 1)?.participantId;
  const nextLevel = getNextTournamentLevel(result.level);
  return {
    ownedCount: owned.size,
    allOwned: owned.size > 0 && owned.size === result.participants.length,
    pastGroups: new Set(result.groupStandings.filter((s) => s.qualified && owned.has(s.participantId)).map((s) => s.participantId)).size,
    onPodium: new Set([...result.arenaPodium, ...result.stylePodium].map((e) => e.participantId).filter((id) => owned.has(id))).size,
    arena,
    style,
    arenaWinnerId: winner(result.arenaPodium),
    styleWinnerId: winner(result.stylePodium),
    ownedQualifierIds: result.qualifiers.flatMap((q) => (owned.has(q.participantId) ? [q.participantId] : [])),
    qualifierCount: result.qualifiers.length,
    hasNextLevel: Boolean(nextLevel),
    euros: result.rewards.reduce((total, reward) => total + reward.euros, 0),
    followers: result.rewards.reduce((total, reward) => total + getTournamentRewardFollowers(reward), 0),
  };
}
