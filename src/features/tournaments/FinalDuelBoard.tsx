import type { TournamentParticipant } from "../../game/types";
import type { DuelSide } from "./finalDuel";
import { TournamentParticipantIdentity } from "./TournamentAthleteIdentity";

/** Names, assaults and the dots of who took each one. */
export function FinalDuelBoard({
  participants,
  score,
  history,
  bestOf,
}: {
  participants: Record<DuelSide, TournamentParticipant>;
  score: Record<DuelSide, number>;
  history: DuelSide[];
  bestOf: number;
}) {
  const who = (side: DuelSide) => (
    <div className={`fd-board-who is-${side}${participants[side].ownedContactId ? " is-owned" : ""}`}>
      <TournamentParticipantIdentity participant={participants[side]} />
      <small>{participants[side].ownedContactId ? "La tua scuola" : "Avversario"}</small>
    </div>
  );
  return (
    <div className="fd-board">
      {who("a")}
      <div className="fd-board-score">
        {/* The key replays the bump when the point lands. */}
        <b key={`a${score.a}`} className={`is-a${score.a ? " is-bump" : ""}`}>{score.a}</b>
        <span>
          <span className="fd-board-pips" aria-hidden="true">
            {Array.from({ length: bestOf }, (_, index) => <i key={index} className={history[index] ? `is-${history[index]}` : undefined} />)}
          </span>
          al meglio dei {bestOf}
        </span>
        <b key={`b${score.b}`} className={`is-b${score.b ? " is-bump" : ""}`}>{score.b}</b>
      </div>
      {who("b")}
    </div>
  );
}
