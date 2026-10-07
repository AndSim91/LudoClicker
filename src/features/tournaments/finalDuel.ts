import { getFormDefinition } from "../../content/forms";
import { STRIKES, type BoutAssault, type BoutMoment, type BoutSide } from "../arena/boutChoreography";
import { LOSE_BODIES, WIN_BODIES, type FighterBody } from "../people/fighterBodies";
import { getAthleteWeapon } from "../../game/athleteStats";
import {
  COMPLEX_TECHNIQUES,
  DISARMED_ARMONICHE,
  getComplexTechniqueForms,
  getNpcStyleForms,
} from "../../game/styleJudging";
import type {
  FormBranch,
  FormId,
  StylePenaltyReason,
  TournamentMatch,
  TournamentParticipant,
  TournamentResult,
  TournamentStyleDetail,
} from "../../game/types";

export type DuelSide = BoutSide;

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

export { STRIKES };
export type DuelMoment = BoutMoment;
export type DuelAssault = BoutAssault;

/** The Style card comes at the end of the bout: one per athlete, one or more sanctions. */
export interface DuelPenalty {
  side: DuelSide;
  /** The last assault: the card goes up once it is over. */
  assault: number;
  reason: StylePenaltyReason;
  count: number;
}

export interface DuelScript {
  assaults: DuelAssault[];
  penalties: DuelPenalty[];
  /** At the end the winner celebrates and the loser takes it badly: one of three stances each. */
  ending: { winner: DuelSide; win: FighterBody; lose: FighterBody };
}

const SAPD_FORMS: Record<string, readonly FormId[]> = {
  Sync: ["form-3-long"],
  Presa: ["form-2"],
  Armonica: ["form-3-long"],
};

function formsOf(participant: TournamentParticipant): readonly FormId[] {
  return participant.knownFormIds ?? getNpcStyleForms(participant.id, participant.numericForms);
}

/** The Form a technique comes from: Armoniche without a sword are Forma 1. */
function formOfTechnique(name: string, forms: readonly FormId[], weapon: FormBranch): FormId | undefined {
  if ((DISARMED_ARMONICHE as readonly string[]).includes(name)) return "form-1";
  return getComplexTechniqueForms(forms, weapon)
    .find((candidate) => COMPLEX_TECHNIQUES[candidate]?.includes(name));
}

function momentsOf(detail: TournamentStyleDetail | undefined, participant: TournamentParticipant): DuelMoment[] {
  const forms = formsOf(participant);
  const weapon = participant.weapon ?? getAthleteWeapon(forms);
  const longName = (form: FormId | undefined) => (form ? getFormDefinition(form)?.longName : undefined);
  const moments: DuelMoment[] = [];
  if (detail?.technique) {
    moments.push({ kind: "COM", name: detail.technique, form: longName(formOfTechnique(detail.technique, forms, weapon)) });
  }
  // Armoniche and Sync are COM and SAPD at once: one moment is enough.
  if (detail?.highlight && detail.highlight !== detail.technique) {
    const form = (DISARMED_ARMONICHE as readonly string[]).includes(detail.highlight)
      ? "form-1"
      : SAPD_FORMS[detail.highlight]?.find((candidate) => forms.includes(candidate));
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
    for (const moment of momentsOf(sides[side].detail, sides[side].participant)) {
      const pool = free.filter((assault) => !assault.moment);
      if (pool.length > 0) pick(roll, pool).moment = moment;
    }
  }
  const penalties: DuelPenalty[] = [];
  for (const [side, reason, count] of [
    ["a", match.stylePenaltyA, match.stylePenaltyCountA],
    ["b", match.stylePenaltyB, match.stylePenaltyCountB],
  ] as const) {
    if (reason) penalties.push({ side, reason, count: count ?? 1, assault: Math.max(0, assaults.length - 1) });
  }
  const ending = {
    winner: match.winnerId === match.participantAId ? "a" : "b",
    win: pick(roll, WIN_BODIES),
    lose: pick(roll, LOSE_BODIES),
  } as const;
  return { assaults, penalties, ending };
}
