import { useMemo } from "react";
import {
  GYM_SABER_COLORS,
  GYM_STAGES,
  getGymSaberRarities,
  getGymStageIndex,
  type GymRarityCounts,
} from "../../content/gymStages";
import { useGameSelector } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";

const BLUE_SABER = GYM_SABER_COLORS.common;

// A stick athlete: "guard" holds the blade upright, "attack" reaches towards
// a partner standing 62 units away, so two attacks cross in the middle.
function Fighter({
  x,
  facing,
  saber,
  pose = "attack",
}: {
  x: number;
  facing: 1 | -1;
  saber: string;
  pose?: "guard" | "attack";
}) {
  const hand = x + 14 * facing;
  const tip = pose === "guard" ? { x: hand + 4 * facing, y: 76 } : { x: hand + 30 * facing, y: 90 };
  return (
    <g className="gym-fighter">
      <circle cx={x} cy={96} r={7} />
      <path d={`M${x} 104 L${x} 128 M${x} 128 L${x - 8} 150 M${x} 128 L${x + 9} 150 M${x} 110 L${hand} 116`} />
      <line className="gym-saber" x1={hand} y1={116} x2={tip.x} y2={tip.y} style={{ color: saber }} />
    </g>
  );
}

// The five blades on the rack: yellow, green, red and two blue, as asked by the school.
const RACK_SABERS = [
  GYM_SABER_COLORS.legendary,
  GYM_SABER_COLORS.rare,
  GYM_SABER_COLORS["secret-legendary"],
  BLUE_SABER,
  BLUE_SABER,
];

// Sparring spots, central pair first: the rarest blades take the centre.
const FIGHTER_SPOTS: [number, 1 | -1][] = [[290, 1], [352, -1], [170, 1], [232, -1], [408, 1], [470, -1]];

// Subscribes to members and contacts only, so money ticks do not repaint the scene.
export function GymScene({ state: stateOverride }: { state?: GameState }) {
  const activeMembers = useGameSelector((state) => state.school.activeMembers, stateOverride);
  const contacts = useGameSelector((state) => state.contacts, stateOverride);
  // Recounted only when the contacts array changes, not on every tick.
  const rarityCounts = useMemo(() => {
    const counts: GymRarityCounts = {};
    for (const contact of contacts) {
      if (contact.status !== "enrolled") continue;
      const rarity = contact.secretLegendaryId ? "secret-legendary" : contact.rarity;
      counts[rarity] = (counts[rarity] ?? 0) + 1;
    }
    return counts;
  }, [contacts]);
  const fighterCount = activeMembers >= 200 ? 6 : activeMembers >= 100 ? 4 : activeMembers >= 5 ? 2 : activeMembers >= 1 ? 1 : 0;
  const sabers = getGymSaberRarities(rarityCounts, fighterCount).map((rarity) => GYM_SABER_COLORS[rarity]);
  const stage = getGymStageIndex(activeMembers);
  const current = GYM_STAGES[stage];
  const next = GYM_STAGES[stage + 1];
  const has = (threshold: number) => activeMembers >= threshold;

  return (
    <figure className="gym-scene">
      <svg viewBox="-180 0 1000 180" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="gym-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#034965" />
            <stop offset="1" stopColor="#0a3a57" />
          </linearGradient>
          <linearGradient id="gym-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbf1dc" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fbf1dc" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Wall and floor run past the viewBox so wide panels have no letterbox. */}
        <rect x="-1000" width="2640" height="180" fill="url(#gym-wall)" />
        <rect x="620" y="30" width="120" height="58" rx="3" className="gym-window" />
        <path d="M680 30 V88 M620 59 H740" className="gym-window-frame" />
        <rect x="-130" y="62" width="44" height="88" rx="2" className="gym-door" />

        <rect x="-1000" y="150" width="2640" height="30" className="gym-floor" />
        <path d="M-1000 162 H1640 M-1000 172 H1640 M-80 150 L-140 180 M80 150 L40 180 M200 150 L180 180 M320 150 V180 M440 150 L460 180 M560 150 L600 180 M720 150 L780 180" className="gym-floor-lines" />

        {has(50) ? (
          <g className="gym-lights">
            <polygon points="250,0 262,0 330,150 190,150" fill="url(#gym-beam)" />
            <polygon points="378,0 390,0 450,150 318,150" fill="url(#gym-beam)" />
          </g>
        ) : null}

        {has(500) ? (
          <g className="gym-crowd">
            {Array.from({ length: 22 }, (_, index) => (
              <circle key={index} cx={68 + index * 24} cy={index % 2 ? 128 : 132} r={6} />
            ))}
            <rect x="56" y="134" width="528" height="8" rx="2" />
          </g>
        ) : null}

        {has(50) ? <rect x="140" y="144" width="360" height="10" rx="3" className="gym-mat" /> : null}

        {has(20) ? (
          <g className="gym-rack">
            <rect x="760" y="96" width="50" height="54" rx="2" />
            {RACK_SABERS.map((color, index) => (
              <line key={index} className="gym-saber" x1={768 + index * 8.5} y1={140} x2={768 + index * 8.5} y2={100} style={{ color }} />
            ))}
          </g>
        ) : null}

        {has(35) ? (
          <g className="gym-banner">
            <path d="M290 0 H350 V70 L320 86 L290 70 Z" />
            <image href="/assets/ordine-emblem.webp" x="301" y="8" width="38" height="50" />
          </g>
        ) : null}

        {has(150) ? (
          <g className="gym-trophies">
            <rect x="-40" y="80" width="84" height="5" rx="1" />
            {[-28, 0, 28].map((x) => (
              <path key={x} d={`M${x - 7} 62 H${x + 7} L${x + 4} 72 H${x - 4} Z M${x - 2} 72 H${x + 2} V78 H${x - 2} Z M${x - 6} 78 H${x + 6} V80 H${x - 6} Z`} />
            ))}
          </g>
        ) : null}

        {has(300) ? (
          <text className="gym-neon" x="-160" y="40">Servizio - Cura - Rispetto</text>
        ) : null}

        {fighterCount === 1 ? <Fighter x={320} facing={1} saber={sabers[0]} pose="guard" /> : null}
        {fighterCount > 1
          ? FIGHTER_SPOTS.slice(0, fighterCount).map(([x, facing], index) => (
              <Fighter key={x} x={x} facing={facing} saber={sabers[index]} />
            ))
          : null}
      </svg>
      <figcaption>
        <strong>{current.name}</strong>
        <span>
          {next
            ? `Prossimo traguardo: ${next.name.toLocaleLowerCase("it-IT")} a ${next.threshold} ${next.threshold === 1 ? "iscritto attivo" : "iscritti attivi"}`
            : "La sede è al completo"}
        </span>
      </figcaption>
    </figure>
  );
}
