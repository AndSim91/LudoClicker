import { useEffect, useRef } from "react";
import { Icon, type IconName } from "../../components/common/Icon";
import type { GameState, MomentKey } from "../../game/types";
import { describeMoment, type MomentContent } from "./momentContent";

/** How long a moment plays before it closes on its own (the game stays paused meanwhile). */
export const MOMENT_DURATION_MS = 6_500;

const OUTLOOK_ICONS: Record<MomentContent["kind"], IconName> = {
  council: "people",
  legendary: "spark",
  victory: "trophy",
  foundation: "flag",
};

const SEATS = Array.from({ length: 12 }, (_, index) => {
  const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
  return { x: 200 + Math.cos(angle) * 150, y: 170 + Math.sin(angle) * 150 };
});

/* Modalità Onde art; the Outlook skin hides it and keeps the sober card. */
function MomentArt({ content }: { content: MomentContent }) {
  if (content.kind === "council") {
    return (
      <svg className="moment-art" viewBox="0 0 400 340" aria-hidden="true">
        <circle className="moment-glow" cx="200" cy="170" r="165" />
        <g className="moment-rise">
          <circle className="moment-ring" cx="200" cy="170" r="150" />
          <circle className="moment-table" cx="200" cy="170" r="95" />
          <path className="moment-wave" d="M150 178 q25 -40 50 0 t50 0" />
          <path className="moment-wave is-soft" d="M162 200 q19 -28 38 0 t38 0" />
          {SEATS.map((seat, index) => index === 0 ? null : (
            <circle key={index} className="moment-seat" cx={seat.x} cy={seat.y} r="9" />
          ))}
          <circle className="moment-halo" cx={SEATS[0].x} cy={SEATS[0].y} r="24" />
          <circle className="moment-seat is-on" cx={SEATS[0].x} cy={SEATS[0].y} r="11" />
        </g>
      </svg>
    );
  }
  if (content.kind === "legendary") {
    return (
      <div className="moment-art moment-legendary-art" aria-hidden="true">
        <span className="moment-pillar" />
        {[0, 1, 2, 3, 4].map((spark) => <span key={spark} className={`moment-spark is-${spark}`} />)}
        <div className="moment-card-flip">
          <span className="moment-card-number">{content.number}</span>
          <span className="moment-card-initials">{content.initials}</span>
          <strong>{content.name}</strong>
          <span className="moment-card-rarity">{content.kicker}</span>
          <span className="moment-card-stats">{content.stats}</span>
        </div>
      </div>
    );
  }
  if (content.kind === "victory") {
    return (
      <svg className="moment-art" viewBox="0 0 400 340" aria-hidden="true">
        <g className="moment-rays">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <path key={angle} d="M200 80 L190 -130 L210 -130z" transform={`rotate(${angle} 200 80)`} />
          ))}
        </g>
        <g className="moment-blade is-left">
          <line className="moment-blade-glow" x1="120" y1="310" x2="120" y2="70" />
          <line className="moment-blade-core" x1="120" y1="310" x2="120" y2="70" />
        </g>
        <g className="moment-blade is-right">
          <line className="moment-blade-glow" x1="280" y1="310" x2="280" y2="70" />
          <line className="moment-blade-core" x1="280" y1="310" x2="280" y2="70" />
        </g>
        <circle className="moment-flash" cx="200" cy="196" r="34" />
        <g className="moment-trophy"><g transform="translate(0 -78)">
          <path d="M165 100 h70 v28 a35 35 0 0 1 -70 0z" />
          <path className="moment-trophy-handle" d="M165 108 h-18 a18 18 0 0 0 21 28 M235 108 h18 a18 18 0 0 1 -21 28" />
          <rect x="192" y="162" width="16" height="22" />
          <rect x="176" y="184" width="48" height="11" rx="2" />
        </g></g>
      </svg>
    );
  }
  return (
    <div className="moment-art moment-foundation-art" aria-hidden="true">
      <svg viewBox="0 0 400 220">
        <path className="moment-grid" d="M0 55 H400 M0 110 H400 M0 165 H400 M80 0 V220 M160 0 V220 M240 0 V220 M320 0 V220" />
        <path className="moment-route" d="M70 150 C 140 40, 260 40, 330 100" pathLength="1" />
        <circle className="moment-city is-old" cx="70" cy="150" r="10" />
        <circle className="moment-city is-new" cx="330" cy="100" r="12" />
      </svg>
      <span className="moment-city-label is-old">{content.from}</span>
      <span className="moment-city-label is-new">{content.to}</span>
    </div>
  );
}

/**
 * Animated moments (4.2). Spectacular in Modalità Onde, an office notice in the
 * Outlook skin (the CSS decides); «Riduci animazioni» leaves them static.
 * Skippable with the button or Esc; closes on its own after MOMENT_DURATION_MS.
 */
export function MomentLayer({
  state,
  momentKey,
  onDismiss,
}: {
  state: GameState;
  momentKey: MomentKey;
  onDismiss: () => void;
}) {
  const content = describeMoment(state, momentKey);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
    const timer = window.setTimeout(() => onDismiss(), MOMENT_DURATION_MS);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onDismiss();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onDismiss]);

  const secret = content.kind === "legendary" && content.secret;
  return (
    <div
      className={`moment-layer is-${content.kind}${secret ? " is-secret" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="moment-title"
      aria-describedby="moment-body"
    >
      <MomentArt content={content} />
      <div className="moment-card">
        <span className="moment-progress" aria-hidden="true"><span /></span>
        <div className="moment-heading">
          <span className="moment-icon" aria-hidden="true"><Icon name={OUTLOOK_ICONS[content.kind]} /></span>
          <div>
            <small className="moment-kicker">{content.kicker}</small>
            <h2 id="moment-title" className="moment-title">{content.title}</h2>
          </div>
        </div>
        <p id="moment-body" className="moment-body">{content.body}</p>
        <div className="moment-actions">
          <button ref={buttonRef} type="button" className="moment-skip" onClick={onDismiss}>
            <span className="moment-skip-office">Continua</span>
            <span className="moment-skip-onde">Salta ▸</span>
          </button>
        </div>
      </div>
    </div>
  );
}
