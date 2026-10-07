import { encodeStyleCode } from "../../game/styleCode";
import { scoreStyleSheet } from "../../game/styleJudging";
import type { StylePenaltyReason, StyleSheet, TournamentMatch } from "../../game/types";

export const STYLE_PENALTY_LABEL: Record<StylePenaltyReason, string> = {
  declaration: "Dichiarazione",
  cura: "Cura",
  rispetto: "Rispetto",
};

export const STYLE_SHEET_ROWS = ["BAS", "MOV", "DIN", "COM", "SAPD", "GCC", "DIF", "SOG", "PEN"] as const;

const pointsFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const judgeFormatter = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Punti di una voce: «2», «2,5». */
export const formatStylePoints = (points: number) => pointsFormatter.format(points);

export interface JudgeVote {
  vote: string;
  code: string;
}

export function describeJudges(sheets: readonly StyleSheet[]): JudgeVote[] {
  return sheets.map((sheet) => ({
    vote: judgeFormatter.format(scoreStyleSheet(sheet)),
    code: encodeStyleCode(sheet),
  }));
}

/** Un solo cartellino a fine incontro, con una o più sanzioni da −0,5. */
export function describePenalty(count: number): string {
  const cost = `−${pointsFormatter.format(count * 0.5)}`;
  return count > 1 ? `${count} sanzioni · ${cost}` : cost;
}

export function getMatchStyleSide(match: TournamentMatch, side: "a" | "b") {
  const [vote, detail, penalty, count] = side === "a"
    ? [match.styleScoreA, match.styleDetailA, match.stylePenaltyA, match.stylePenaltyCountA]
    : [match.styleScoreB, match.styleDetailB, match.stylePenaltyB, match.stylePenaltyCountB];
  return { vote, detail, penalty, penalties: penalty ? count ?? 1 : 0 };
}
