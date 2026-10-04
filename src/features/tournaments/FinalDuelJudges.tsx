import type { CSSProperties } from "react";
import type { TournamentMatch, TournamentParticipant } from "../../game/types";
import { formatVote } from "../../shared/formatters";
import { participantName } from "./tournamentPresentation";
import { StyleCardMark } from "./StyleCardMark";
import { STYLE_PENALTY_LABEL, describeJudges, getMatchStyleSide } from "./stylePresentation";

/** Seconds between two judges raising their sign. */
const SIGN_SECONDS = 0.45;

/**
 * Fine della finale: un eventuale cartellino di Stile, poi i giudici alzano il
 * cartello uno alla volta (voto e codice Servizio) e arriva la media. Per gli
 * esterni c'è solo la media.
 */
export function FinalDuelJudges({
  match,
  a,
  b,
  startSeconds,
}: {
  match: TournamentMatch;
  a: TournamentParticipant;
  b: TournamentParticipant;
  startSeconds: number;
}) {
  const sides = [
    { participant: a, ...getMatchStyleSide(match, "a") },
    { participant: b, ...getMatchStyleSide(match, "b") },
  ];
  const penalties = sides.filter((side) => side.penalty);
  let clock = startSeconds + (penalties.length > 0 ? 0.6 : 0);
  const delay = (seconds: number) => ({ "--delay": `${seconds}s` }) as CSSProperties;
  const judgeCount = Math.max(1, ...sides.map((side) => side.detail?.sheets.length ?? 0));

  return (
    <div className="final-duel-judges" style={delay(startSeconds)}>
      <span>Voto di Stile dei giudici</span>
      {penalties.map((side) => (
        <p key={side.participant.id} className="final-duel-style-card" style={delay(startSeconds)}>
          <StyleCardMark reason={side.penalty!} large />
          Cartellino di Stile a {participantName(side.participant)} · {STYLE_PENALTY_LABEL[side.penalty!]} · −0,5
        </p>
      ))}
      {sides.map((side) => {
        const judges = side.detail ? describeJudges(side.detail.sheets) : [];
        const rowStart = clock;
        clock += (judges.length + 1) * SIGN_SECONDS;
        return (
          <div
            key={side.participant.id}
            className={`final-duel-judge-row${side.participant.ownedContactId ? " is-owned" : ""}`}
            style={{ "--judges": judgeCount } as CSSProperties}
          >
            <small>{participantName(side.participant)}</small>
            {judges.map((judge, index) => (
              <span key={index} className="final-duel-paddle" style={delay(rowStart + index * SIGN_SECONDS)}>
                <b>{judge.vote}</b>
                <code>{judge.code}</code>
                <small>{index === 0 ? "Riferimento" : `Giudice ${index + 1}`}</small>
              </span>
            ))}
            {Array.from({ length: judgeCount - judges.length }, (_, index) => (
              <span key={`empty-${index}`} aria-hidden="true" />
            ))}
            <span
              className="final-duel-paddle is-average"
              style={delay(rowStart + judges.length * SIGN_SECONDS)}
            >
              <b>{formatVote(side.vote)}</b>
              <small>{judges.length > 1 ? "media" : "Stile"}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
