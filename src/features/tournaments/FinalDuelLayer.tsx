import { useEffect, useRef, type CSSProperties } from "react";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import type { TournamentParticipant, TournamentResult } from "../../game/types";
import { getAssaultSequence, getOwnedFinal } from "./finalDuel";
import { TournamentParticipantIdentity } from "./TournamentAthleteIdentity";
import { participantName } from "./tournamentPresentation";

/** Seconds each assault takes on screen (the duel is --duel in final-duel.css). */
const ASSAULT_SECONDS = 3;
/** Where the bind sways in the two middle exchanges, so no assault looks the same. */
const SWAYS = [["-9%", "7%"], ["8%", "-10%"], ["-5%", "11%"]];

function FighterCard({ participant, side }: { participant: TournamentParticipant; side: "a" | "b" }) {
  const owned = Boolean(participant.ownedContactId);
  return (
    <div className={`final-duel-fighter is-${side}${owned ? " is-owned" : ""}`}>
      <small>{owned ? "La tua scuola" : "Avversario"}</small>
      <TournamentParticipantIdentity participant={participant} />
      <span>
        Forma {participant.numericForms} · Arena {Math.round(participant.arenaPreparation)} · Stile{" "}
        {Math.round(participant.stylePreparation)}
      </span>
    </div>
  );
}

/**
 * «Guarda la finale» (4.3): the Arena final with one of the player's athletes,
 * assault by assault, then the style vote. The game keeps running underneath.
 */
export function FinalDuelLayer({
  result,
  onClose,
  onShowResults = onClose,
}: {
  result: TournamentResult;
  onClose: () => void;
  /** Opens this tournament in Tornei › Risultati; already there, it just closes. */
  onShowResults?: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const final = getOwnedFinal(result);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!final) return null;
  const { match, a, b } = final;
  const sequence = getAssaultSequence(match);
  const endDelay = `${sequence.length * ASSAULT_SECONDS}s`;
  const winner = match.winnerId === a.id ? a : b;
  const ownWinner = Boolean(winner.ownedContactId);
  const nameOf = (side: "a" | "b") => participantName(side === "a" ? a : b);
  const blades = {
    "--blade-a": `var(--blade-${a.rarity})`,
    "--blade-b": `var(--blade-${b.rarity})`,
  } as CSSProperties;
  const running = { a: 0, b: 0 };

  return (
    <div
      className="final-duel-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="final-duel-title"
    >
      <div className="final-duel">
        <header>
          <div>
            <small>{TOURNAMENT_DEFINITIONS[result.level].label} · Stagione {result.season} · Arena</small>
            <h2 id="final-duel-title">Finale</h2>
          </div>
          <button ref={closeRef} type="button" className="final-duel-close" onClick={onClose} aria-label="Chiudi la finale">
            ×
          </button>
        </header>
        <div className="final-duel-ring">
          <FighterCard participant={a} side="a" />
          <div className="final-duel-center">
            <div className="final-duel-score" style={{ "--delay": endDelay } as CSSProperties}>
              <strong>{match.arenaScoreA}</strong>
              <span>Assalti · al meglio dei 3</span>
              <strong>{match.arenaScoreB}</strong>
            </div>
            <ol className="final-duel-assaults" style={blades}>
              {sequence.map((side, index) => {
                running[side] += 1;
                const hit = side === "a" ? "b" : "a";
                return (
                  <li
                    key={index}
                    className={`is-${side}`}
                    style={{
                      "--delay": `${index * ASSAULT_SECONDS}s`,
                      "--s1": SWAYS[index % 3][0],
                      "--s2": SWAYS[index % 3][1],
                    } as CSSProperties}
                  >
                    <span className="final-duel-assault-label">Assalto {index + 1}</span>
                    {/* Crossed blades end on the side of whoever takes the OH. */}
                    <span className="final-duel-track" aria-hidden="true">
                      <span className="final-duel-blades">
                        <span className="final-duel-blade is-a" />
                        <span className="final-duel-blade is-b" />
                        <span className="final-duel-spark" />
                      </span>
                      <span className="final-duel-oh">OH!</span>
                    </span>
                    <span className="final-duel-assault-outcome">
                      OH a {nameOf(hit)} · punto a {nameOf(side)} · {running.a}–{running.b}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="final-duel-style" style={{ "--delay": endDelay } as CSSProperties}>
              <span>Voto di Stile dei giudici</span>
              {([["a", match.styleScoreA], ["b", match.styleScoreB]] as const).map(([side, vote]) => (
                <span key={side} className={`final-duel-vote is-${side}`}>
                  <span className="final-duel-vote-bar" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, vote * 10)}%` }} />
                  </span>
                  <b>{vote.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b>
                </span>
              ))}
            </div>
            <p className={`final-duel-verdict${ownWinner ? " is-ours" : ""}`} style={{ "--delay": endDelay } as CSSProperties}>
              {participantName(winner)} vince la finale {Math.max(match.arenaScoreA, match.arenaScoreB)} a{" "}
              {Math.min(match.arenaScoreA, match.arenaScoreB)}
            </p>
          </div>
          <FighterCard participant={b} side="b" />
        </div>
        <footer>
          <button type="button" onClick={onShowResults}>Mostra i risultati</button>
          <button type="button" className="is-primary" onClick={onClose}>Chiudi</button>
        </footer>
      </div>
    </div>
  );
}
