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

export function getMatchStyleSide(match: TournamentMatch, side: "a" | "b") {
  return side === "a"
    ? { vote: match.styleScoreA, detail: match.styleDetailA, penalty: match.stylePenaltyA }
    : { vote: match.styleScoreB, detail: match.styleDetailB, penalty: match.stylePenaltyB };
}
