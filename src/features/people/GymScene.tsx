import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  GYM_SABER_COLORS,
  GYM_STAGES,
  getGymFighterCount,
  getGymSaberRarities,
  getGymStageIndex,
  type GymRarity,
  type GymRarityCounts,
} from "../../content/gymStages";
import { useGameSelector } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";
import type { BoutSide } from "../arena/boutChoreography";
import { GymBoutPair } from "./GymBoutPair";
import { GymActor, GymPair } from "./GymPair";
import { GymLayer, SaberLayers } from "./GymLayers";
import {
  GYM_JUDGE_STAND_CHANCE,
  GYM_JUDGE_STAND_MS,
  addGymPoint,
  applyGymCard,
  isGymMatchOver,
  rollGymCard,
  type GymScore,
} from "./gymMatch";
import { GymReferees, GymScoreboard, type RaisedCard } from "./GymReferees";
import { GymRackSwap, type RackTurns } from "./GymRackSwap";
import { GYM_FIRST_LIFESPAN_MS, GYM_LIFESPAN_MS, GYM_MAX_WALKERS, between, pickSwapRarity } from "./gymRack";
import { canSpar, type RackHold } from "./gymSparring";
import { useJudgeReading } from "./useJudgeReading";
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
const RACK_BODY_BOX: GymBox = { x: 756, y: 92, w: 58, h: 62 };
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
  const [judgeUp, setJudgeUp] = useState(false);
  const [points, setPoints] = useState(0);
  const timers = useRef<number[]>([]);
  const standTimer = useRef<number | undefined>(undefined);
  const later = (ms: number, next: () => void) => timers.current.push(window.setTimeout(next, ms));
  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    window.clearTimeout(standTimer.current);
  }, []);

  const onPoint = useCallback((side: BoutSide) => {
    timers.current = [];
    if (standTimer.current === undefined && Math.random() < GYM_JUDGE_STAND_CHANCE) {
      const [min, max] = GYM_JUDGE_STAND_MS;
      setJudgeUp(true);
      standTimer.current = window.setTimeout(() => {
        standTimer.current = undefined;
        setJudgeUp(false);
      }, min + Math.random() * (max - min));
    }
    setPoints((current) => current + 1);
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

  return { score, card, judgeUp, points, onPoint };
}

// Where each blade of getGymSaberRarities stands: the central pair, then the side
// pairs from the left (see the pairs at the bottom of GymScene).
const SLOT_X = [290, 352, 170, 232, 408, 470];
const pairOf = (slot: number) => Math.floor(slot / 2);
// How often the scene looks for an athlete whose time on the mat is up. Not the
// game tick: it only reads refs and sets state when someone actually leaves.
const RACK_CHECK_MS = 1_500;

interface RackWalk {
  id: number;
  slot: number;
  sabers: [string, string];
  to: GymRarity;
}

/**
 * Rack swaps for everyone (13/10, concepts R1 + V2 + C2): each athlete on the
 * mat stays 120–150 s, then walks to the rack and is replaced, never halfway
 * through a bout and at most two walking at a time. The new blade follows the
 * members' rarities and what is already on the mat (gymRack.ts).
 */
function useRackSwaps(enabled: boolean, fighterCount: number, counts: GymRarityCounts) {
  const target = useMemo(() => getGymSaberRarities(counts, fighterCount), [counts, fighterCount]);
  const [overrides, setOverrides] = useState<Partial<Record<number, GymRarity>>>({});
  const shown = target.map((rarity, slot) => overrides[slot] ?? rarity);
  const [walks, setWalks] = useState<RackWalk[]>([]);
  const holds = [
    useRef<RackHold>({ away: false, busy: false }),
    useRef<RackHold>({ away: false, busy: false }),
    useRef<RackHold>({ away: false, busy: false }),
  ];
  const [h0, h1, h2] = holds;
  const owner = useRef<number | null>(null);
  const rack = useMemo<RackTurns>(() => ({
    claim: (id) => {
      if (owner.current !== null && owner.current !== id) return false;
      owner.current = id;
      return true;
    },
    release: (id) => {
      if (owner.current === id) owner.current = null;
    },
  }), []);
  const due = useRef<number[]>([]);
  const nextId = useRef(0);
  const live = useRef({ shown, target, counts, walks });
  useEffect(() => {
    live.current = { shown, target, counts, walks };
  });

  // A new layout (more pairs, no rack) starts the clocks again, staggered.
  useEffect(() => {
    if (!enabled) return undefined;
    const now = Date.now();
    due.current = Array.from({ length: fighterCount }, () => now + between(Math.random, GYM_FIRST_LIFESPAN_MS));
    const pairs = [h0, h1, h2];
    return () => {
      pairs.forEach((hold) => {
        hold.current.away = false;
      });
      owner.current = null;
      setWalks([]);
      setOverrides({});
    };
  }, [enabled, fighterCount, h0, h1, h2]);

  useEffect(() => {
    if (!enabled) return undefined;
    const pairs = [h0, h1, h2];
    const timer = window.setInterval(() => {
      const { shown: mat, target: goal, counts: members, walks: walking } = live.current;
      if (!canSpar() || walking.length >= GYM_MAX_WALKERS) return;
      const now = Date.now();
      const slot = due.current.findIndex((at, index) =>
        now >= at && !walking.some((walk) => walk.slot === index) && !pairs[pairOf(index)].current.busy);
      if (slot < 0) return;
      const to = pickSwapRarity(mat.filter((_, index) => index !== slot), goal, members, Math.random);
      pairs[pairOf(slot)].current.away = true;
      nextId.current += 1;
      const walk = { id: nextId.current, slot, to, sabers: [GYM_SABER_COLORS[mat[slot]], GYM_SABER_COLORS[to]] as [string, string] };
      live.current.walks = [...walking, walk];
      setWalks((list) => [...list, walk]);
    }, RACK_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [enabled, h0, h1, h2]);

  const onDone = useCallback((id: number) => {
    const walk = live.current.walks.find((item) => item.id === id);
    if (!walk) return;
    const rest = live.current.walks.filter((item) => item.id !== id);
    live.current.walks = rest;
    [h0, h1, h2][pairOf(walk.slot)].current.away = rest.some((item) => pairOf(item.slot) === pairOf(walk.slot));
    due.current[walk.slot] = Date.now() + between(Math.random, GYM_LIFESPAN_MS);
    setOverrides((current) => ({ ...current, [walk.slot]: walk.to }));
    setWalks(rest);
  }, [h0, h1, h2]);

  const away = (slot: number) => walks.some((walk) => walk.slot === slot);
  return { shown, walks, holds, rack, onDone, away };
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

  const stage = getGymStageIndex(activeMembers);
  const current = GYM_STAGES[stage];
  const next = GYM_STAGES[stage + 1];
  const hall = stage >= HALL_STAGE;
  const judges = stage >= JUDGES_STAGE;
  const view = hall ? VIEW.hall : VIEW.gym;
  const viewBox = `${view.x} ${view.y} ${view.w} ${view.h}`;
  const match = useGymMatch();
  const reading = useJudgeReading(match.points);
  const rack = useRackSwaps(stage >= 1 && fighterCount >= 2, fighterCount, rarityCounts);
  const sabers = rack.shown.map((rarity) => GYM_SABER_COLORS[rarity]);
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

        {/* Walkers come before the pairs: in the back lane they pass behind them (concept V2). */}
        {rack.walks.map((walk) => (
          <GymRackSwap key={walk.id} id={walk.id} homeX={SLOT_X[walk.slot]} sabers={walk.sabers} rack={rack.rack} onDone={rack.onDone} />
        ))}
        {/* The rack's body is a layer above the walker, who goes behind it. */}
        {stage >= 1 ? (
          <GymLayer box={RACK_BODY_BOX} className="gym-rack">
            <rect x="760" y="96" width="50" height="54" rx="2" />
          </GymLayer>
        ) : null}

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

        {judges ? <GymReferees card={match.card} styleJudgeUp={match.judgeUp} reading={reading} /> : null}

        {fighterCount === 1 ? <GymActor x={320} facing={1} saber={sabers[0]} pose="guard" /> : null}
        {fighterCount >= 2 ? (
          <GymBoutPair
            leftX={PAIR_SPOTS[0]}
            rightX={PAIR_SPOTS[0] + PAIR_GAP}
            sabers={[sabers[0], sabers[1]]}
            onPoint={match.onPoint}
            hold={rack.holds[0]}
            away={[rack.away(0), rack.away(1)]}
          />
        ) : null}
        {PAIR_SPOTS.slice(1, Math.floor(fighterCount / 2)).map((x, index) => (
          <GymPair
            key={x}
            leftX={x}
            rightX={x + PAIR_GAP}
            sabers={[sabers[(index + 1) * 2], sabers[(index + 1) * 2 + 1]]}
            index={index + 1}
            hold={rack.holds[index + 1]}
            away={[rack.away((index + 1) * 2), rack.away((index + 1) * 2 + 1)]}
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
