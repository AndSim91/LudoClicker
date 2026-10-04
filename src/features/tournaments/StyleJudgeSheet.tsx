import type { TournamentMatch, TournamentParticipant } from "../../game/types";
import { formatVote } from "../../shared/formatters";
import { participantName } from "./tournamentPresentation";
import { StyleCardMark } from "./StyleCardMark";
import {
  STYLE_PENALTY_LABEL,
  STYLE_SHEET_ROWS,
  describeJudges,
  formatStylePoints,
  getMatchStyleSide,
} from "./stylePresentation";

/**
 * Il giudizio di Stile dell'incontro come sul telefono del giudice (app
 * Servizio): le voci del Riferimento per gli atleti della scuola, il solo voto
 * per gli esterni, e i voti con il codice di ogni giudice.
 */
export function StyleJudgeSheet({
  match,
  a,
  b,
}: {
  match: TournamentMatch;
  a: TournamentParticipant | undefined;
  b: TournamentParticipant | undefined;
}) {
  const left = getMatchStyleSide(match, "a");
  const right = getMatchStyleSide(match, "b");
  const sheetA = left.detail?.sheets[0];
  const sheetB = right.detail?.sheets[0];
  if (!sheetA && !sheetB && !left.penalty && !right.penalty) return null;

  const cell = (side: typeof left, sheet: typeof sheetA, index: number) => {
    if (sheet) return formatStylePoints(sheet[index]);
    if (STYLE_SHEET_ROWS[index] === "PEN") return side.penalty ? "1" : "0";
    return <span aria-hidden="true">·</span>;
  };
  // ponytail: if both athletes are ours, the left one's technique wins the label.
  const notes: Partial<Record<(typeof STYLE_SHEET_ROWS)[number], string>> = {
    COM: left.detail?.technique ?? right.detail?.technique,
    SAPD: left.detail?.highlight ?? right.detail?.highlight,
  };

  return (
    <section className="style-sheet" aria-label="Giudizio di Stile">
      <header className="style-sheet-head">
        <div className={a?.ownedContactId ? "is-owned" : undefined}>
          <b>{formatVote(left.vote)}</b>
          <small>{participantName(a)}</small>
          {left.penalty ? <StyleCardMark reason={left.penalty} /> : null}
        </div>
        <span className="style-sheet-arena">
          {match.arenaScoreA}–{match.arenaScoreB}
          <small>Arena</small>
        </span>
        <div className={b?.ownedContactId ? "is-owned" : undefined}>
          <b>{formatVote(right.vote)}</b>
          <small>{participantName(b)}</small>
          {right.penalty ? <StyleCardMark reason={right.penalty} /> : null}
        </div>
      </header>
      <table className="style-sheet-rows">
        <tbody>
          {STYLE_SHEET_ROWS.map((row, index) => {
            const detail = notes[row];
            const lit = (sheetA?.[index] ?? 0) > 0 || (sheetB?.[index] ?? 0) > 0;
            return (
              <tr key={row} className={`is-${row.toLowerCase()}${lit ? " is-lit" : ""}`}>
                <td>{cell(left, sheetA, index)}</td>
                <th scope="row">
                  {row}
                  {detail ? <em> · {detail}</em> : null}
                </th>
                <td>{cell(right, sheetB, index)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {[
        { sheet: left.detail?.sheets, name: participantName(a) },
        { sheet: right.detail?.sheets, name: participantName(b) },
      ].map(({ sheet, name }) =>
        sheet ? (
          <ol key={name} className="style-sheet-judges" aria-label={`Giudici di ${name}`}>
            {describeJudges(sheet).map((judge, index) => (
              <li key={index} className={index === 0 ? "is-reference" : undefined}>
                <small>{index === 0 ? (sheet.length > 1 ? "Riferimento" : "Giudice") : `Giudice ${index + 1}`}</small>
                <b>{judge.vote}</b>
                <code>{judge.code}</code>
              </li>
            ))}
          </ol>
        ) : null,
      )}
      {[left, right].map((side, index) =>
        side.penalty ? (
          <p key={index} className="style-sheet-penalty">
            <StyleCardMark reason={side.penalty} />
            {participantName(index === 0 ? a : b)} · {STYLE_PENALTY_LABEL[side.penalty]} · −0,5
          </p>
        ) : null,
      )}
    </section>
  );
}
