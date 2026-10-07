import { encodeStyleCode } from "../../game/styleCode";
import { scoreStyleSheet } from "../../game/styleJudging";
import type { StyleSheet, TournamentParticipant } from "../../game/types";
import { formatVote } from "../../shared/formatters";
import type { DuelSide } from "./finalDuel";
import { SERVIZIO_ROWS, type DuelView } from "./finalDuelTimeline";
import { participantName } from "./tournamentPresentation";

const averageFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const PEN_ROW = 8;

/**
 * Servizio as the final goes: the average of every judge, for both athletes.
 * Old finals without the opponent's sheets show only that athlete's vote.
 */
export function FinalServizioPhone({
  view,
  participants,
  votes,
  judges,
}: {
  view: DuelView;
  participants: Record<DuelSide, TournamentParticipant>;
  /** Final votes, for an athlete without sheets. */
  votes: Record<DuelSide, number>;
  judges: number;
}) {
  // Live, PEN follows the card raised at the end of the bout.
  const sheetsOf = (side: DuelSide) =>
    view.sheets[side]?.map((sheet): StyleSheet => [...sheet.slice(0, PEN_ROW), view.penalty[side]] as StyleSheet);
  const cell = (side: DuelSide, row: number) => {
    const sheets = sheetsOf(side);
    if (!sheets) {
      return row === PEN_ROW ? <span className="fd-phone-value">{view.penalty[side]}</span> : <span className="fd-phone-value is-dim" aria-hidden="true">·</span>;
    }
    const value = sheets.reduce((sum, sheet) => sum + sheet[row], 0) / sheets.length;
    return <span className={`fd-phone-value${value > 0 && row < PEN_ROW ? " is-lit" : ""}`}>{averageFormatter.format(value)}</span>;
  };
  const head = (side: DuelSide) => {
    const sheets = sheetsOf(side);
    const vote = sheets
      ? formatVote(sheets.reduce((sum, sheet) => sum + scoreStyleSheet(sheet), 0) / sheets.length)
      : view.done ? formatVote(votes[side]) : "—";
    return (
      <div className={`fd-phone-side is-${side}${participants[side].ownedContactId ? " is-owned" : ""}`}>
        <b>{vote}</b>
        <small>
          {participantName(participants[side])}
          {view.penalty[side] > 0 ? <span className="fd-style-card" role="img" aria-label="Cartellino di Stile" /> : null}
        </small>
      </div>
    );
  };
  const codes = view.done
    ? (["a", "b"] as const).flatMap((side) => {
        const sheets = sheetsOf(side);
        return sheets ? [{ side, name: participants[side].firstName, codes: sheets.map(encodeStyleCode) }] : [];
      })
    : [];

  return (
    <section className="fd-phone" aria-label="Servizio">
      <div className="fd-phone-bar">
        <span>Servizio</span>
        <span>{judges > 1 ? <>media di <b>{judges} giudici</b></> : <b>1 giudice</b>}</span>
      </div>
      <div className="fd-phone-head">
        {head("a")}
        <div className="fd-phone-arena">
          {view.score.a}–{view.score.b}
          <small>Arena</small>
        </div>
        {head("b")}
      </div>
      <div className="fd-phone-rows">
        {SERVIZIO_ROWS.map((name, row) => (
          <div key={name} className={`fd-phone-row is-${name.toLowerCase()}`}>
            <span className={`fd-phone-plus${view.pressed.includes(`a${row}`) ? " is-pressed" : ""}`} aria-hidden="true">+</span>
            {cell("a", row)}
            <span className="fd-phone-name">{name}</span>
            {cell("b", row)}
            <span className={`fd-phone-plus${view.pressed.includes(`b${row}`) ? " is-pressed" : ""}`} aria-hidden="true">+</span>
          </div>
        ))}
      </div>
      <div className={`fd-phone-codes${view.done ? " is-on" : ""}`}>
        {codes.map((entry) => (
          <div key={entry.side}>
            {entry.name}:{" "}
            {entry.codes.map((code, index) => (
              <span key={index}>
                {index > 0 ? " · " : null}
                <code title={`Giudice ${index + 1}`}>{code}</code>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
