import type { TournamentParticipant } from "../../game/types";
import type { DuelScript, DuelSide } from "./finalDuel";
import { participantName } from "./tournamentPresentation";
import { describePenalty, STYLE_PENALTY_LABEL } from "./stylePresentation";

/** Outlook: the final as a plain report, assault by assault. No animation. */
export function FinalDuelReport({
  script,
  participants,
}: {
  script: DuelScript;
  participants: Record<DuelSide, TournamentParticipant>;
}) {
  const score = { a: 0, b: 0 };
  return (
    <div className="fd-report">
      <h3>Assalti</h3>
      <ol>
        {script.assaults.map((assault, index) => {
          score[assault.winner] += 1;
          const touched = assault.winner === "a" ? "b" : "a";
          const { moment } = assault;
          return (
            <li key={index}>
              <span>Assalto {index + 1}</span>
              <span>
                {moment ? (
                  <><b>{moment.name}</b> ({[moment.kind, moment.form].filter(Boolean).join(" · ")})</>
                ) : assault.strike.name}{" "}
                di <b>{participantName(participants[assault.winner])}</b>
                {moment?.name === "Disarmo" ? `: ${participantName(participants[touched])} perde la spada` : null}
                {" "}· «OH!» su {participantName(participants[touched])}
              </span>
              <span>{score.a}–{score.b}</span>
            </li>
          );
        })}
      </ol>
      {script.penalties.length > 0 ? (
        <>
          <h3>Cartellini di Stile</h3>
          <ol>
            {script.penalties.map((penalty) => (
              <li key={penalty.side}>
                <span>Fine incontro</span>
                <span>
                  Cartellino di Stile a <b>{participantName(participants[penalty.side])}</b> · {STYLE_PENALTY_LABEL[penalty.reason]} · {describePenalty(penalty.count)}
                </span>
                <span />
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}
