import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  GYM_SABER_COLORS,
  GYM_STAGES,
  getGymFighterCount,
  getGymSaberRarities,
  getGymStageIndex,
  type GymRarityCounts,
} from "../../content/gymStages";
import { useGameSelector } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";
import type { BoutSide } from "../arena/boutChoreography";
import { GymBoutPair } from "./GymBoutPair";
import { GymActor, GymPair } from "./GymPair";
import { GymLayer, SaberLayers } from "./GymLayers";
import { addGymPoint, applyGymCard, isGymMatchOver, rollGymCard, type GymScore } from "./gymMatch";
import { GymReferees, GymScoreboard, type RaisedCard } from "./GymReferees";
import type { GymBox } from "./gymBox";

const BLUE_SABER = GYM_SABER_COLORS.common;

// The five blades on the rack: yellow, green, red and two blue, as asked by the school.
const RACK_SABERS = [
  GYM_SABER_COLORS.legendary,
  GYM_SABER_COLORS.rare,
  GYM_SABER_COLORS["secret-legendary"],
  BLUE_SABER,
  BLUE_SABER,
];

const LIGHT_BEAMS = ["250,0 262,0 330,150 190,150", "378,0 390,0 450,150 318,150"];
const LIGHT_BOXES: GymBox[] = [
  { x: 190, y: 0, w: 140, h: 150 },
  { x: 318, y: 0, w: 132, h: 150 },
];
const RACK_BOX: GymBox = { x: 752, y: 86, w: 66, h: 68 };
const BULB_BOX: GymBox = { x: 260, y: 0, w: 120, h: 150 };
// Palazzetto: two lamps on the trusses sweep the Arena (lamp x, aim x).
const SWEEPS: Array<[number, number]> = [[60, 300], [580, 340]];

// Sparring pairs (left athlete's x), central pair first: the rarest blades take the centre.
const PAIR_SPOTS = [290, 170, 408];
const PAIR_GAP = 62;

/** The gym's frame: the palestra (as before) or the wider palazzetto, same 170 px band. */
const VIEW = {
  gym: { x: -180, y: 0, w: 1000, h: 180 },
  hall: { x: -420, y: -40, w: 1480, h: 230 },
};

const HALL_STAGE = GYM_STAGES.findIndex((stage) => stage.name === "Palazzetto");
const JUDGES_STAGE = GYM_STAGES.findIndex((stage) => stage.name === "Arena e giudici");

/** Best of 5 on the central Arena: points and cards only after the central pair's cut. */
function useGymMatch() {
  const [score, setScore] = useState<GymScore>({ a: 0, b: 0 });
  const [card, setCard] = useState<RaisedCard>();
  const timers = useRef<number[]>([]);
  const later = (ms: number, next: () => void) => timers.current.push(window.setTimeout(next, ms));
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const onPoint = useCallback((side: BoutSide) => {
    timers.current = [];
    setScore((current) => addGymPoint(current, side));
    const raised = rollGymCard(Math.random);
    if (!raised) return;
    later(300, () => setCard({ id: Date.now(), card: raised }));
    later(1_000, () => setScore((current) => applyGymCard(current, side, raised)));
    later(2_100, () => setCard(undefined));
  }, []);

  useEffect(() => {
    if (!isGymMatchOver(score)) return undefined;
    const timer = window.setTimeout(() => setScore({ a: 0, b: 0 }), 2_600);
    return () => window.clearTimeout(timer);
  }, [score]);

  return { score, card, onPoint };
}

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
  const fighterCount = getGymFighterCount(activeMembers);
  const sabers = getGymSaberRarities(rarityCounts, fighterCount).map((rarity) => GYM_SABER_COLORS[rarity]);
  const stage = getGymStageIndex(activeMembers);
  const current = GYM_STAGES[stage];
  const next = GYM_STAGES[stage + 1];
  const hall = stage >= HALL_STAGE;
  const judges = stage >= JUDGES_STAGE;
  const view = hall ? VIEW.hall : VIEW.gym;
  const viewBox = `${view.x} ${view.y} ${view.w} ${view.h}`;
  const match = useGymMatch();
  const tiers = [0, 1, 2, 3];

  return (
    <figure className="gym-scene">
      {/* Static scenery in two SVGs (behind and in front of the light beams);
          everything that moves is a layer of its own (GymLayers.tsx). */}
      <div
        className={hall ? "gym-stage is-hall" : "gym-stage"}
        style={{ "--vb-cx": view.x + view.w / 2, "--vb-cy": view.y + view.h / 2, "--vb-w": view.w, "--vb-h": view.h } as CSSProperties}
      >
        <svg className="gym-backdrop" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <linearGradient id="gym-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={hall ? "#022a42" : "#034965"} />
              <stop offset={hall ? 0.3 : 0} stopColor="#034965" />
              <stop offset="1" stopColor="#0a3a57" />
            </linearGradient>
          </defs>

          {/* Wall and floor run past the viewBox so wide panels have no letterbox. */}
          <rect x="-1000" y={view.y} width="2640" height={180 - view.y} fill="url(#gym-wall)" />
          {hall ? (
            <path
              className="gym-truss"
              d={`M-460 -4 H1100 M-460 -36 H1100${Array.from({ length: 39 }, (_, i) => ` M${-460 + i * 40} -4 L${-440 + i * 40} -36 L${-420 + i * 40} -4`).join("")}`}
            />
          ) : null}
          <rect x="620" y="30" width="120" height="58" rx="3" className="gym-window" />
          <path d="M680 30 V88 M620 59 H740" className="gym-window-frame" />
          <rect x="-130" y="62" width="44" height="88" rx="2" className="gym-door" />

          <rect x="-1000" y="150" width="2640" height="80" className="gym-floor" />
          <path d="M-1000 162 H1640 M-1000 172 H1640 M-80 150 L-140 180 M80 150 L40 180 M200 150 L180 180 M320 150 V180 M440 150 L460 180 M560 150 L600 180 M720 150 L780 180" className="gym-floor-lines" />

          {hall ? (
            <g className="gym-tiers">
              {tiers.map((i) => (
                <g key={i}>
                  <rect x={-440} y={126 - i * 24} width={250 - i * 22} height={24} />
                  <rect x={830 + i * 22} y={126 - i * 24} width={250 - i * 22} height={24} />
                </g>
              ))}
            </g>
          ) : null}
          {hall ? (
            <g className="gym-crowd">
              {tiers.map((i) => {
                const heads = (from: number, to: number) =>
                  Array.from({ length: Math.floor((to - from) / 14) + 1 }, (_, k) => (
                    <circle key={`${from}-${k}`} cx={from + k * 14} cy={122 - i * 24} r={5} />
                  ));
                return <g key={i}>{heads(-432, -200 - i * 22)}{heads(840 + i * 22, 1072)}</g>;
              })}
            </g>
          ) : null}
        </svg>

        {stage >= 2
          ? LIGHT_BEAMS.map((points, index) => (
              <GymLayer key={points} box={LIGHT_BOXES[index]} className="gym-light">
                <defs>
                  <linearGradient id={`gym-beam-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fbf1dc" stopOpacity="0.35" />
                    <stop offset="1" stopColor="#fbf1dc" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon points={points} fill={`url(#gym-beam-${index})`} />
              </GymLayer>
            ))
          : (
            // The rented room: one bulb on its wire, swaying.
            <GymLayer box={BULB_BOX} className="gym-bulb">
              <defs>
                <linearGradient id="gym-bulb-cone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fbf1dc" stopOpacity="0.3" />
                  <stop offset="1" stopColor="#fbf1dc" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="gym-bulb-wire" d="M320 0 V30" />
              <path className="gym-bulb-shade" d="M310 38 L314 30 H326 L330 38 Z" />
              <circle className="gym-bulb-glow" cx={320} cy={40} r={4} />
              <polygon points="312,39 328,39 380,150 260,150" fill="url(#gym-bulb-cone)" />
            </GymLayer>
          )}

        {hall
          ? SWEEPS.map(([lamp, aim], index) => {
              const box = { x: Math.min(lamp - 6, aim - 70), y: -36, w: Math.max(lamp + 6, aim + 70) - Math.min(lamp - 6, aim - 70), h: 190 };
              return (
                <GymLayer
                  key={lamp}
                  box={box}
                  className="gym-sweep"
                  style={{ transformOrigin: `${((lamp - box.x) / box.w) * 100}% 3%` }}
                >
                  <defs>
                    <linearGradient id={`gym-sweep-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#fbf1dc" stopOpacity="0.22" />
                      <stop offset="1" stopColor="#fbf1dc" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <rect className="gym-lamp" x={lamp - 9} y={-36} width={18} height={10} rx={2} />
                  <polygon points={`${lamp - 4},-28 ${lamp + 4},-28 ${aim + 60},152 ${aim - 60},152`} fill={`url(#gym-sweep-${index})`} />
                </GymLayer>
              );
            })
          : null}

        <svg className="gym-backdrop" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {judges ? (
            <g className="gym-crowd">
              {Array.from({ length: 22 }, (_, index) => (
                <circle key={index} cx={68 + index * 24} cy={index % 2 ? 128 : 132} r={6} />
              ))}
              <rect x="56" y="134" width="528" height="8" rx="2" />
            </g>
          ) : null}

          {stage >= 1 ? <rect x="140" y="144" width="360" height="10" rx="3" className="gym-mat" /> : null}
          {judges ? <ellipse cx="321" cy="151" rx="66" ry="7" className="gym-arena" /> : null}

          {stage >= 1 ? (
            <g className="gym-rack">
              <rect x="760" y="96" width="50" height="54" rx="2" />
            </g>
          ) : null}

          {stage >= 2 ? (
            <g className="gym-banner">
              <path d="M290 0 H350 V70 L320 86 L290 70 Z" />
              <image href="/assets/ordine-emblem.webp" x="301" y="8" width="38" height="50" />
            </g>
          ) : null}

          {judges ? (
            <g className="gym-trophies">
              <rect x="-40" y="80" width="84" height="5" rx="1" />
              {[-28, 0, 28].map((x) => (
                <path key={x} d={`M${x - 7} 62 H${x + 7} L${x + 4} 72 H${x - 4} Z M${x - 2} 72 H${x + 2} V78 H${x - 2} Z M${x - 6} 78 H${x + 6} V80 H${x - 6} Z`} />
              ))}
            </g>
          ) : null}
        </svg>

        {hall ? <GymScoreboard score={match.score} /> : null}

        {/* Rack blades hum in two alternating groups, as before (odd ones 2 s ahead). */}
        {stage >= 1
          ? [0, 1].map((parity) => (
              <SaberLayers
                key={parity}
                box={RACK_BOX}
                lines={RACK_SABERS.flatMap((color, index) => index % 2 === parity
                  ? [[768 + index * 8.5, 140, 768 + index * 8.5, 100, color] as [number, number, number, number, string]]
                  : [])}
                delay={parity ? "-2s" : undefined}
              />
            ))
          : null}

        {judges ? <GymReferees card={match.card} /> : null}

        {fighterCount === 1 ? <GymActor x={320} facing={1} saber={sabers[0]} pose="guard" /> : null}
        {fighterCount >= 2 ? (
          <GymBoutPair
            leftX={PAIR_SPOTS[0]}
            rightX={PAIR_SPOTS[0] + PAIR_GAP}
            sabers={[sabers[0], sabers[1]]}
            onPoint={match.onPoint}
          />
        ) : null}
        {PAIR_SPOTS.slice(1, Math.floor(fighterCount / 2)).map((x, index) => (
          <GymPair
            key={x}
            leftX={x}
            rightX={x + PAIR_GAP}
            sabers={[sabers[(index + 1) * 2], sabers[(index + 1) * 2 + 1]]}
            index={index + 1}
          />
        ))}
      </div>
      <figcaption>
        <strong>{current.name}</strong>
        <span>
          {next
            ? `Prossimo traguardo: ${next.name.charAt(0).toLocaleLowerCase("it-IT") + next.name.slice(1)}, a ${next.threshold.toLocaleString("it-IT")} iscritti`
            : "La sede è al completo"}
        </span>
      </figcaption>
    </figure>
  );
}
