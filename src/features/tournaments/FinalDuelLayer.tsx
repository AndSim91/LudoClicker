import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { TOURNAMENT_DEFINITIONS } from "../../content/tournaments";
import { getStyleJudgeCount } from "../../game/styleJudging";
import type { TournamentResult } from "../../game/types";
import { motionReduced } from "../../shared/motion";
import { useOutlookTheme } from "../../shared/useOutlookTheme";
import { FinalArena } from "./FinalArena";
import { getDuelScript, getOwnedFinal, type DuelScript, type DuelSide } from "./finalDuel";
import { FinalDuelBoard } from "./FinalDuelBoard";
import { FinalDuelReport } from "./FinalDuelReport";
import { applyEvent, buildTimeline, endView, startView, type DuelSheets } from "./finalDuelTimeline";
import { FinalServizioPhone } from "./FinalServizioPhone";
import { participantName } from "./tournamentPresentation";

/**
 * The fight plays on its own clock (max 30 s). It keeps running under the
 * Outlook report, so flipping back to Onde finds it where it got to.
 */
function usePlayback(script: DuelScript, sheets: DuelSheets) {
  const [view, dispatch] = useReducer(applyEvent, sheets, (initial) => startView(initial));
  const [animate] = useState(() => !motionReduced());
  useEffect(() => {
    if (!animate) return undefined;
    const { events } = buildTimeline(script, sheets, Math.random);
    const timers = events.map((event) => window.setTimeout(() => dispatch(event), event.t));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [animate, script, sheets]);
  return animate ? view : undefined;
}

/**
 * «Guarda la finale» (4.3): the Arena final with one of the player's athletes.
 * Modalità Onde fights it out while Servizio fills in, for both athletes, as
 * the average of the judges; Outlook shows the same final as a static report.
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
  const final = useMemo(() => getOwnedFinal(result), [result]);
  const match = final?.match;
  const script = useMemo<DuelScript>(() => (final ? getDuelScript(final) : { assaults: [], penalties: [], ending: { winner: "a", win: "win-sky", lose: "lose-head" } }), [final]);
  const sheets = useMemo<DuelSheets>(
    () => ({ a: match?.styleDetailA?.sheets, b: match?.styleDetailB?.sheets }),
    [match],
  );
  const ended = useMemo(() => endView(script, sheets), [script, sheets]);
  const live = usePlayback(script, sheets);
  // Outlook is the light camouflage: there the final is a plain report (F9 can flip it mid-final).
  const outlook = useOutlookTheme();

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

  if (!final || !match) return null;
  const { a, b } = final;
  const participants = { a, b };
  const view = outlook || !live ? ended : live;
  const winner = match.winnerId === a.id ? a : b;
  const judges = Math.max(
    sheets.a?.length ?? 0,
    sheets.b?.length ?? 0,
    getStyleJudgeCount(result.level, "final"),
  );
  const bestOf = Math.max(match.arenaScoreA, match.arenaScoreB) * 2 - 1;
  const sabers: Record<DuelSide, string> = { a: `var(--blade-${a.rarity})`, b: `var(--blade-${b.rarity})` };

  return (
    <div className="final-duel-layer" role="dialog" aria-modal="true" aria-labelledby="final-duel-title">
      <div className={`final-duel${outlook ? " is-report" : ""}`}>
        <header>
          <div>
            <small>{TOURNAMENT_DEFINITIONS[result.level].label} · Stagione {result.season} · Arena</small>
            <h2 id="final-duel-title">Finale</h2>
          </div>
          <button ref={closeRef} type="button" className="final-duel-close" onClick={onClose} aria-label="Chiudi la finale">
            ×
          </button>
        </header>
        <div className="fd-body">
          <div className="fd-main">
            <FinalDuelBoard participants={participants} score={view.score} history={view.history} bestOf={bestOf} />
            {outlook ? (
              <FinalDuelReport script={script} participants={participants} />
            ) : (
              <div className={`fd-arena-frame${view.fighting ? " is-fighting" : ""}`}>
                <FinalArena level={result.level} view={view} judges={judges} sabers={sabers} />
              </div>
            )}
          </div>
          <FinalServizioPhone
            view={view}
            participants={participants}
            votes={{ a: match.styleScoreA, b: match.styleScoreB }}
            judges={judges}
          />
        </div>
        <p className={`final-duel-verdict${winner.ownedContactId ? " is-ours" : ""}`} aria-live="polite">
          {view.done
            ? `${participantName(winner)} vince la finale ${Math.max(match.arenaScoreA, match.arenaScoreB)} a ${Math.min(match.arenaScoreA, match.arenaScoreB)}`
            : null}
        </p>
        <footer>
          <button type="button" onClick={onShowResults}>Mostra i risultati</button>
          <button type="button" className="is-primary" onClick={onClose}>Chiudi</button>
        </footer>
      </div>
    </div>
  );
}
