import { getFormDefinition } from "../../content/forms";
import { COMPLEX_TECHNIQUES, getNpcStyleForms } from "../../game/styleJudging";
import type {
  FormId,
  StylePenaltyReason,
  TournamentMatch,
  TournamentParticipant,
  TournamentResult,
  TournamentStyleDetail,
} from "../../game/types";

export type DuelSide = "a" | "b";

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

function hashOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return hash;
}

/** Same final, same replay: every choice of the script comes from the match id. */
export function seededRoll(seed: string): () => number {
  let state = hashOf(seed) >>> 0;
  return () => {
    // mulberry32
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const pick = <T>(roll: () => number, list: readonly T[]): T =>
  list[Math.min(list.length - 1, Math.floor(roll() * list.length))];

/**
 * Who took each assault. Finals since the best of 5 keep the real order; older
 * ones kept only the score (2–0 or 2–1), so the loser's point lands in the
 * first or second assault, chosen from the match id.
 */
export function getAssaultSequence(match: TournamentMatch): DuelSide[] {
  if (match.assaults) return [...match.assaults] as DuelSide[];
  const winner = match.winnerId === match.participantAId ? "a" : "b";
  const loser = winner === "a" ? "b" : "a";
  const loserPoints = Math.min(match.arenaScoreA, match.arenaScoreB);
  if (loserPoints === 0) return [winner, winner];
  return (hashOf(match.id) & 1) === 0 ? [loser, winner, winner] : [winner, loser, winner];
}

/** Cuts that score: never a thrust. `from` is the blade's starting angle, `y` where it lands. */
export const STRIKES = [
  { name: "Fendente alla spalla", from: -105, y: 106 },
  { name: "Tondo al fianco", from: -165, y: 121 },
  { name: "Montante al busto", from: 85, y: 116 },
  { name: "Diagonale al braccio", from: -60, y: 111 },
  { name: "Taglio alla gamba", from: -40, y: 137 },
] as const;

export interface DuelMoment {
  kind: "COM" | "SAPD";
  name: string;
  /** «Forma 1», «Forma 3 Spada Lunga»; none for a Disarmo. */
  form?: string;
}

export interface DuelAssault {
  winner: DuelSide;
  strike: (typeof STRIKES)[number];
  /** A COM or SAPD is the decisive cut of an assault won by whoever performs it. */
  moment?: DuelMoment;
}

export interface DuelPenalty {
  side: DuelSide;
  assault: number;
  reason: StylePenaltyReason;
}

export interface DuelScript {
  assaults: DuelAssault[];
  penalties: DuelPenalty[];
}

const SAPD_FORMS: Record<string, readonly FormId[]> = {
  Sync: ["form-3-long"],
  Presa: ["form-2"],
  Armonica: ["form-1", "form-3-long"],
};

function formsOf(participant: TournamentParticipant): readonly FormId[] {
  return participant.knownFormIds ?? getNpcStyleForms(participant.id, participant.numericForms);
}

function momentsOf(detail: TournamentStyleDetail | undefined, forms: readonly FormId[]): DuelMoment[] {
  const longName = (form: FormId | undefined) => (form ? getFormDefinition(form)?.longName : undefined);
  const moments: DuelMoment[] = [];
  if (detail?.technique) {
    // ponytail: a name shared by two weapons («Circolare») goes to the first known Form.
    const form = forms.find((candidate) => COMPLEX_TECHNIQUES[candidate]?.includes(detail.technique!));
    moments.push({ kind: "COM", name: detail.technique, form: longName(form) });
  }
  if (detail?.highlight) {
    const form = SAPD_FORMS[detail.highlight]?.find((candidate) => forms.includes(candidate));
    moments.push({ kind: "SAPD", name: detail.highlight, form: longName(form) });
  }
  return moments;
}

export function getDuelScript({ match, a, b }: OwnedFinal): DuelScript {
  const roll = seededRoll(match.id);
  const assaults: DuelAssault[] = getAssaultSequence(match).map((winner) => ({
    winner,
    strike: pick(roll, STRIKES),
  }));
  const sides = { a: { participant: a, detail: match.styleDetailA }, b: { participant: b, detail: match.styleDetailB } };
  for (const side of ["a", "b"] as const) {
    const free = assaults.filter((assault) => assault.winner === side);
    for (const moment of momentsOf(sides[side].detail, formsOf(sides[side].participant))) {
      const pool = free.filter((assault) => !assault.moment);
      if (pool.length > 0) pick(roll, pool).moment = moment;
    }
  }
  const penalties: DuelPenalty[] = [];
  for (const [side, reason] of [["a", match.stylePenaltyA], ["b", match.stylePenaltyB]] as const) {
    if (reason) penalties.push({ side, reason, assault: Math.floor(roll() * assaults.length) });
  }
  return { assaults, penalties };
}
