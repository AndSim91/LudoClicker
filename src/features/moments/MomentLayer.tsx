import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motionReduced } from "../../shared/motion";
import { Icon, type IconName } from "../../components/common/Icon";
import { GAME_CONFIG } from "../../game/config";
import type { GameState, MomentKey } from "../../game/types";
import { ChroniclesArt } from "./ChroniclesArt";
import { FoundationArt } from "./FoundationArt";
import { GadgetArt } from "./GadgetArt";
import { LegendaryArt } from "./LegendaryArt";
import { SocialArt } from "./SocialArt";
import { SuperbaArt } from "./SuperbaArt";
import { TAPPA_ONE_DURATION_MS, TappaOneArt } from "./TappaOneArt";
import { COUNCIL_SEATS, describeMoment, type MomentContent } from "./momentContent";

/** How long a moment's animation lasts; then it stays still until the player closes it. */
export const MOMENT_DURATION_MS = 6_500;

const OUTLOOK_ICONS: Record<MomentContent["kind"], IconName> = {
  council: "people",
  legendary: "spark",
  victory: "trophy",
  foundation: "flag",
  inflation: "coin",
  superba: "trophy",
  chronicles: "key",
  social: "megaphone",
  gadget: "gift",
  tappa: "trophy",
};

/** Lama di Luce letterhead: three crossed blades, green, white and red. */
const DECREE_BLADES = [["is-green", -32], ["is-red", 32], ["is-white", 0]] as const;
const SPORT_SWORD_LABEL = "Spada per combattimento sportivo";

/* Consiglio: eight scattered collaborators take their seats around one table,
 * then the table reaches the five sectors of the whole team. */
const COUNCIL_CENTER = { x: 200, y: 165 };
const COUNCIL_SEAT_RADIUS = 112;
const SCATTER = [[-40, -150], [150, -90], [130, 30], [170, 130], [-20, 150], [-190, 120], [-170, 20], [-120, -110]];
const SECTOR_RADIUS = 152;
const SECTOR_ARC = (Math.PI * 2) / 5;
const SECTOR_GAP = 0.16;

function polar(radius: number, angle: number) {
  return { x: COUNCIL_CENTER.x + Math.cos(angle) * radius, y: COUNCIL_CENTER.y + Math.sin(angle) * radius };
}

function getCouncilSeats(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const seat = polar(COUNCIL_SEAT_RADIUS, (index / count) * Math.PI * 2 - Math.PI / 2);
    const [dx, dy] = SCATTER[index % SCATTER.length];
    return { ...seat, fromX: dx, fromY: dy };
  });
}

const SECTORS = Array.from({ length: 5 }, (_, index) => {
  const start = index * SECTOR_ARC - Math.PI / 2 + SECTOR_GAP / 2;
  const end = start + SECTOR_ARC - SECTOR_GAP;
  const from = polar(SECTOR_RADIUS, start);
  const to = polar(SECTOR_RADIUS, end);
  const middle = polar(SECTOR_RADIUS - 10, (start + end) / 2);
  const dots = [0.2, 0.4, 0.6, 0.8].map((step) => polar(SECTOR_RADIUS, start + (end - start) * step));
  return {
    arc: `M${from.x} ${from.y} A${SECTOR_RADIUS} ${SECTOR_RADIUS} 0 0 1 ${to.x} ${to.y}`,
    ray: `M${COUNCIL_CENTER.x} ${COUNCIL_CENTER.y} L${middle.x} ${middle.y}`,
    dots,
  };
});

/* Modalità Onde art; the Outlook skin hides it and keeps the sober card. */
function MomentArt({ content }: { content: MomentContent }) {
  if (content.kind === "council") {
    const seats = getCouncilSeats(COUNCIL_SEATS);
    return (
      <svg className="moment-art moment-council" viewBox="0 0 400 340" aria-hidden="true">
        <circle className="moment-glow" cx={COUNCIL_CENTER.x} cy={COUNCIL_CENTER.y} r="165" />
        <g className="moment-sectors">
          {SECTORS.map((sector, index) => (
            <g key={index} className="moment-sector" style={{ animationDelay: `${3 + index * 0.18}s` }}>
              <path className="moment-sector-ray" d={sector.ray} />
              <path className="moment-sector-arc" d={sector.arc} />
              {sector.dots.map((dot, dotIndex) => (
                <circle key={dotIndex} className="moment-sector-dot" cx={dot.x} cy={dot.y} r="3.5" />
              ))}
            </g>
          ))}
        </g>
        <g className="moment-table-group">
          <circle className="moment-table" cx={COUNCIL_CENTER.x} cy={COUNCIL_CENTER.y} r="80" />
          <image
            className="moment-council-emblem"
            href="/assets/ordine-emblem.webp"
            x={COUNCIL_CENTER.x - 42}
            y={COUNCIL_CENTER.y - 58}
            width="84"
            height="110"
          />
        </g>
        <circle className="moment-halo" cx={COUNCIL_CENTER.x} cy={COUNCIL_CENTER.y} r="80" />
        {seats.map((seat, index) => (
          <g
            key={index}
            className="moment-seat"
            style={{
              "--seat-from-x": `${seat.fromX}px`,
              "--seat-from-y": `${seat.fromY}px`,
              animationDelay: `${0.2 + index * 0.12}s`,
            } as CSSProperties}
          >
            <circle cx={seat.x} cy={seat.y} r="16" />
            <text x={seat.x} y={seat.y}>{content.seats[index] ?? ""}</text>
          </g>
        ))}
      </svg>
    );
  }
  if (content.kind === "legendary") return <LegendaryArt />;
  if (content.kind === "inflation") {
    return (
      <div className="moment-art moment-decree" aria-hidden="true">
        <div className="moment-decree-sheet">
          <span className="moment-decree-logo">
            <svg viewBox="0 0 80 80">
              {DECREE_BLADES.map(([color, angle]) => (
                <g key={color} className={color} transform={`rotate(${angle} 40 46)`}>
                  <rect className="moment-decree-blade" x="37" y="5" width="6" height="41" rx="3" />
                  <rect className="moment-decree-guard" x="32" y="46" width="16" height="3.5" rx="1.5" />
                  <rect className="moment-decree-grip" x="37.5" y="49.5" width="5" height="15" rx="1.5" />
                  <circle className="moment-decree-guard" cx="40" cy="66" r="2.6" />
                </g>
              ))}
            </svg>
            LAMA DI LUCE
          </span>
          <strong className="moment-decree-title">{content.title}</strong>
          <p className="moment-decree-body">{content.body}</p>
          <div className="moment-decree-price">
            <span>{SPORT_SWORD_LABEL}</span>
            <s>{content.oldPrice}</s>
            <b>{content.newPrice}</b>
          </div>
          <span className="moment-decree-stamp">{content.increase}</span>
        </div>
      </div>
    );
  }
  if (content.kind === "chronicles") return <ChroniclesArt />;
  if (content.kind === "social") return <SocialArt followers={content.followers} />;
  if (content.kind === "gadget") return <GadgetArt />;
  if (content.kind === "tappa") return <TappaOneArt still={motionReduced()} />;
  if (content.kind === "superba") return <SuperbaArt city={content.city} fameLabel={content.fameLabel} />;
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
    <FoundationArt
      number={content.number}
      stars={content.stars}
      dropped={content.dropped}
      previousCity={content.previousCity}
      newcomerName={content.newcomerName}
      newcomerCity={content.newcomerCity}
    />
  );
}

/**
 * Animated moments (4.2). Spectacular in Modalità Onde, an office notice in the
 * Outlook skin (the CSS decides); «Riduci animazioni» leaves them static.
 * While it plays only «Salta» (or Esc) closes it; once still, after
 * MOMENT_DURATION_MS, the button reads «Chiudi» and any click closes it.
 */
export function MomentLayer({
  state,
  momentKey,
  content: replayed,
  onDismiss,
}: {
  state: GameState;
  /** A queued moment, read from the state; or `content`, a scene replayed from the LudoWiki. */
  momentKey?: MomentKey;
  content?: MomentContent;
  onDismiss: () => void;
}) {
  const content = replayed ?? describeMoment(state, momentKey ?? "council");
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Static scenes («Riduci animazioni») are finished from the start.
  const [finished, setFinished] = useState(motionReduced);

  useEffect(() => {
    buttonRef.current?.focus();
    const timer = window.setTimeout(
      () => setFinished(true),
      content.kind === "tappa" ? TAPPA_ONE_DURATION_MS : MOMENT_DURATION_MS,
    );
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
  }, [onDismiss, content.kind]);

  const secret = content.kind === "legendary" && content.secret;
  return (
    <div
      className={`moment-layer is-${content.kind}${secret ? " is-secret" : ""}${finished ? " is-finished" : ""}`}
      onClick={finished ? onDismiss : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="moment-title"
      aria-describedby="moment-body"
    >
      <MomentArt content={content} />
      <div className="moment-card">
        <span className="moment-progress" aria-hidden="true"><span /></span>
        <div className="moment-heading">
          <span className="moment-icon" aria-hidden="true">
            {content.kind === "superba"
              ? <img src="/assets/superba-logo.webp" alt="" />
              : <Icon name={OUTLOOK_ICONS[content.kind]} />}
          </span>
          <div>
            <small className="moment-kicker">{content.kicker}</small>
            <h2 id="moment-title" className="moment-title">{content.title}</h2>
          </div>
        </div>
        <p id="moment-body" className="moment-body">{content.body}</p>
        {content.kind === "inflation" ? (
          <p className="moment-price">
            <span>{SPORT_SWORD_LABEL}</span>
            <s>{content.oldPrice}</s> → <b>{content.newPrice} ({content.increase})</b>
          </p>
        ) : null}
        {content.kind === "chronicles" ? (
          <>
            <p className="moment-price"><span>Chiavi disponibili</span><b>0 → 1</b></p>
            <p className="moment-price"><span>Squadra</span><b>{GAME_CONFIG.chroniclesTeamSize} atleti</b></p>
            <p className="moment-price"><span>Dove</span><b>Tornei › Open</b></p>
          </>
        ) : null}
        {content.kind === "tappa" ? (
          // Outlook: the podium as bars (PO, approved 07/10); hidden in Modalità Onde.
          <div className="moment-podium-bars" aria-hidden="true">
            {([[2, "is-second"], [1, "is-first"], [3, "is-third"]] as const).map(([place, className]) => (
              <span key={place} className={className}><b>{place}</b></span>
            ))}
          </div>
        ) : null}
        {content.kind === "foundation" ? (
          <p className="moment-price">
            <span>Stelle del simbolo</span>
            <b>{content.tally}</b>
          </p>
        ) : null}
        <div className="moment-actions">
          <button ref={buttonRef} type="button" className="moment-skip" onClick={(event) => { event.stopPropagation(); onDismiss(); }}>
            {finished ? "Chiudi" : <>Salta<span className="moment-skip-onde" aria-hidden="true"> ▸</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}
