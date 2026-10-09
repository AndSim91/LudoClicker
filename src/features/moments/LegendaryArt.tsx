import type { CSSProperties } from "react";
import { ATHLETE_HEAD_R } from "../people/athleteShape";

/*
 * «Ombra lunga» (concept C5, approvato il 09/10/2026): ai lati della porta della
 * Palestra si srotolano gli stendardi della scuola; le porte si aprono su luce e
 * fumo a filo della soglia; in controluce la sagoma accende la spada, avanza
 * allungando la sua ombra verso di noi, prende colore dai piedi alla testa. Il
 * fumo esce e si posa a terra. Per un Leggendario Segreto l'oro diventa rosso.
 * Base = ultimo fotogramma; moments.css anima dallo stato nascosto.
 */

// L'atleta stilizzato dei combattimenti (athletePose(0, 1, "guard") di athleteShape.ts),
// con le gambe divise in due passi per la camminata.
const TORSO = "M0 104 L0 128 M0 110 L14 116";
const STEPS = ["M0 128 L-8 150 M0 128 L9 150", "M0 128 L-3 150 M0 128 L4 150"] as const;
const BLADE = { x1: 14, y1: 116, x2: 18, y2: 76 };

/** Il fumo che esce: posizione finale [left, top, larghezza, altezza] in cqw; parte dalla soglia. */
const THRESHOLD = [50, 39] as const;
const PUFFS = [
  [20, 36, 22, 8], [34, 38, 26, 9], [52, 37, 26, 9], [64, 36, 22, 8],
  [42, 34, 18, 7], [10, 40, 20, 7], [72, 40, 20, 7], [46, 40, 20, 6],
] as const;

const EMBLEM = "/assets/ordine-emblem.webp";
const RED_FILTER_ID = "legendary-emblem-red";

/** Lo stendardo della Palestra (GymScene) lungo il doppio e allargato per l'emblema. */
function Banner({ side }: { side: "left" | "right" }) {
  return (
    <svg className={`lg-banner is-${side}`} viewBox="-51 -1 102 174">
      <path d="M-50 0 H50 V146 L0 172 L-50 146 Z" />
      <image className="lg-emblem-gold" href={EMBLEM} x={-35} y={36} width={70} height={91} />
      <image className="lg-emblem-red" href={EMBLEM} x={-35} y={36} width={70} height={91} filter={`url(#${RED_FILTER_ID})`} />
    </svg>
  );
}

function Athlete({ layer }: { layer: "lit" | "shade" }) {
  const strokes = [`lg-${layer}-under`, `lg-${layer}-top`];
  return (
    <g className={`lg-${layer}`}>
      {strokes.map((stroke, index) => (
        <g key={stroke} className={stroke}>
          <circle cx={0} cy={96} r={index === 0 ? ATHLETE_HEAD_R + 2.5 : ATHLETE_HEAD_R} />
          <path d={TORSO} />
          {STEPS.map((step, stepIndex) => <path key={step} className={`lg-step-${stepIndex}`} d={step} />)}
        </g>
      ))}
    </g>
  );
}

export function LegendaryArt() {
  return (
    <div className="moment-art moment-legendary-art" aria-hidden="true">
      <svg className="lg-defs" width="0" height="0">
        <filter id={RED_FILTER_ID}>
          <feFlood floodColor="#e25a4d" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </svg>
      <Banner side="left" />
      <Banner side="right" />
      <div className="lg-frame"><span className="lg-light" /></div>
      <span className="lg-floor" />
      <span className="lg-shadow" />
      <div className="lg-figure">
        <div className="lg-walk">
          <svg viewBox="-30 60 60 95" preserveAspectRatio="xMidYMax meet">
            <Athlete layer="lit" />
            <Athlete layer="shade" />
            <g className="lg-saber">
              <line className="is-glow" {...BLADE} />
              <line className="is-color" {...BLADE} />
              <line className="is-core" {...BLADE} />
            </g>
            <line className="lg-hilt" x1={14} y1={116} x2={13.4} y2={122} />
          </svg>
        </div>
      </div>
      <div className="lg-doorway"><span className="lg-bank" /></div>
      <div className="lg-doorway lg-doors"><span className="lg-door is-left" /><span className="lg-door is-right" /></div>
      <div className="lg-smoke">
        {PUFFS.map(([left, top, width, height], index) => (
          <span
            key={`${left}-${top}`}
            className="lg-puff"
            style={{
              left: `${left}cqw`,
              top: `${top}cqw`,
              width: `${width}cqw`,
              height: `${height}cqw`,
              "--puff-x": `${THRESHOLD[0] - (left + width / 2)}cqw`,
              "--puff-y": `${THRESHOLD[1] - (top + height / 2)}cqw`,
              animationDelay: `${1.5 + (index % 4) * 0.12}s`,
            } as CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}
