import { useEffect, useState } from "react";
import { ChroniclesKeyIcon } from "./ChroniclesIcons";

export const CHRONICLES_TOURNAMENT_LOADING_MS = 5_000;

const CHRONICLES_LOADING_PHASES = ["Gironi", "Eliminazione", "Classifica"] as const;

export function ChroniclesTournamentLoading({
  durationMs = CHRONICLES_TOURNAMENT_LOADING_MS,
}: {
  durationMs?: number;
}) {
  const [activePhase, setActivePhase] = useState(0);

  useEffect(() => {
    const phaseDurationMs = durationMs / CHRONICLES_LOADING_PHASES.length;
    const timers = CHRONICLES_LOADING_PHASES.slice(1).map((_, index) =>
      window.setTimeout(
        () => setActivePhase(index + 1),
        phaseDurationMs * (index + 1),
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [durationMs]);

  return (
    <section
      className="chronicles-tournament-loading"
      aria-labelledby="chronicles-loading-title"
      aria-busy="true"
      role="status"
    >
      <div className="chronicles-loading-emblem" aria-hidden="true">
        <i />
        <i />
        <span>
          <ChroniclesKeyIcon />
        </span>
      </div>
      <h2 id="chronicles-loading-title">Chronicles of Ludosport</h2>
      <strong>Il torneo è in corso</strong>
      <p>I sei atleti stanno affrontando le prove di Arena e Stile.</p>
      <ol className="chronicles-loading-progress" aria-label="Fasi del torneo">
        {CHRONICLES_LOADING_PHASES.map((label, index) => {
          const complete = index < activePhase;
          const active = index === activePhase;
          return (
            <li
              key={label}
              className={complete ? "is-complete" : active ? "is-active" : undefined}
              aria-current={active ? "step" : undefined}
            >
              <span aria-hidden="true">{complete ? "✓" : ""}</span>
              <b>{label}</b>
            </li>
          );
        })}
      </ol>
      <small>La cronaca ufficiale sarà disponibile tra pochi istanti.</small>
    </section>
  );
}
