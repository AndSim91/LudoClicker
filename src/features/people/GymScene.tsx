import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
import { GymBoutPair } from "./GymBoutPair";
import { GymActor, GymPair } from "./GymPair";
import { GymLayer, SaberLayers } from "./GymLayers";
import { GYM_JUDGE_STAND_CHANCE, GYM_JUDGE_STAND_MS, rollGymCard } from "./gymMatch";
import { GymReferees, type RaisedCard } from "./GymReferees";
import { HallBackdrop, HallFront, HallHaze, HallLights } from "./GymHallScenery";
import { PAIR_GAP, getGymLayout, getRackSide, mirrorX, type GymLayout, type RackSide } from "./gymHall";
import { GymRackSwap, type RackTurns } from "./GymRackSwap";
import { GYM_FIRST_LIFESPAN_MS, GYM_LIFESPAN_MS, GYM_MAX_WALKING_PAIRS, between, pickSwapRarity } from "./gymRack";
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
const mirrorBox = (box: GymBox, side: RackSide): GymBox => (side > 0 ? box : { ...box, x: 640 - box.x - box.w });

/** The gym's frame: the palestra (as before) or the wider palazzetto, same 170 px band. */
const VIEW = {
  gym: { x: -180, y: 0, w: 1000, h: 180 },
  hall: { x: -420, y: -40, w: 1480, h: 230 },
};

const JUDGES_STAGE = GYM_STAGES.findIndex((stage) => stage.name === "Arena e giudici");

/** Cards on the central Arena, only after the central pair's cut. */
function useGymMatch() {
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

  const onPoint = useCallback(() => {
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
    const raised = rollGymCard(Math.random);
    if (!raised) return;
    later(300, () => setCard({ id: Date.now(), card: raised }));
    later(2_100, () => setCard(undefined));
  }, []);

  return { card, judgeUp, points, onPoint };
}

// How often the scene looks for a pair whose time on the mat is up. Not the
// game tick: it only reads refs and sets state when a pair actually leaves.
const RACK_CHECK_MS = 1_500;

interface RackWalk {
  id: number;
  pair: number;
  /** Per athlete (left, right): the blade going out and the one coming back. */
  sabers: Array<[string, string]>;
  to: [GymRarity, GymRarity];
  side: RackSide;
}

/**
 * Rack swaps (13/10, concepts R1 + V2 + C2): each pair on the mat stays
 * 120–180 s, then walks to the rack together and is replaced by a new pair, so
 * nobody stands alone waiting for a partner. Never halfway through a bout, one
 * pair at a time per rack (two racks from the Arena delle Onde, 14/10: from the
 * championship each pair goes to the one on its side). The new blades follow the members' rarities and what is
 * already on the mat (gymRack.ts).
 */
function useRackSwaps(enabled: boolean, fighterCount: number, counts: GymRarityCounts, layout: GymLayout) {
  const target = useMemo(() => getGymSaberRarities(counts, fighterCount), [counts, fighterCount]);
  const [overrides, setOverrides] = useState<Partial<Record<number, GymRarity>>>({});
  const shown = target.map((rarity, slot) => overrides[slot] ?? rarity);
  const [walks, setWalks] = useState<RackWalk[]>([]);
  // One hold per pair (five at most), shared with the pair's component.
  const h0 = useRef<RackHold>({ away: false, busy: false });
  const h1 = useRef<RackHold>({ away: false, busy: false });
  const h2 = useRef<RackHold>({ away: false, busy: false });
  const h3 = useRef<RackHold>({ away: false, busy: false });
  const h4 = useRef<RackHold>({ away: false, busy: false });
  // One turn per rack: the right one first, the left one second.
  const racks = useMemo(() => [1, -1].map((): RackTurns => {
    let owner: number | null = null;
    return {
      claim: (id) => {
        if (owner !== null && owner !== id) return false;
        owner = id;
        return true;
      },
      release: (id) => {
        if (owner === id) owner = null;
      },
    };
  }), []);
  const due = useRef<number[]>([]);
  const nextId = useRef(0);
  const live = useRef({ shown, target, counts, walks, layout });
  useEffect(() => {
    live.current = { shown, target, counts, walks, layout };
  });

  // A new layout (more pairs, no rack) starts the clocks again, staggered.
  useEffect(() => {
    if (!enabled) return undefined;
    const now = Date.now();
    due.current = Array.from({ length: Math.floor(fighterCount / 2) }, () => now + between(Math.random, GYM_FIRST_LIFESPAN_MS));
    const holds = [h0, h1, h2, h3, h4];
    return () => {
      holds.forEach((hold) => {
        hold.current.away = false;
      });
      setWalks([]);
      setOverrides({});
    };
  }, [enabled, fighterCount]);

  useEffect(() => {
    if (!enabled) return undefined;
    const holds = [h0, h1, h2, h3, h4];
    const timer = window.setInterval(() => {
      const { shown: mat, target: goal, counts: members, walks: walking, layout: scene } = live.current;
      if (!canSpar()) return;
      const now = Date.now();
      const pair = due.current.findIndex((at, index) => {
        const side = getRackSide(scene, index);
        return now >= at
          && !walking.some((walk) => walk.pair === index)
          && walking.filter((walk) => walk.side === side).length < GYM_MAX_WALKING_PAIRS
          && !holds[index].current.busy;
      });
      if (pair < 0) return;
      // Two new blades, one after the other, each seeing the one drawn before.
      const left = 2 * pair;
      const staying = mat.filter((_, slot) => slot !== left && slot !== left + 1);
      const first = pickSwapRarity(staying, goal, members, Math.random);
      const second = pickSwapRarity([...staying, first], goal, members, Math.random);
      holds[pair].current.away = true;
      nextId.current += 1;
      const walk: RackWalk = {
        id: nextId.current,
        pair,
        to: [first, second],
        side: getRackSide(scene, pair),
        sabers: [
          [GYM_SABER_COLORS[mat[left]], GYM_SABER_COLORS[first]],
          [GYM_SABER_COLORS[mat[left + 1]], GYM_SABER_COLORS[second]],
        ],
      };
      live.current.walks = [...walking, walk];
      setWalks((list) => [...list, walk]);
    }, RACK_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);

  const onDone = useCallback((id: number) => {
    const walk = live.current.walks.find((item) => item.id === id);
    if (!walk) return;
    const rest = live.current.walks.filter((item) => item.id !== id);
    live.current.walks = rest;
    [h0, h1, h2, h3, h4][walk.pair].current.away = false;
    due.current[walk.pair] = Date.now() + between(Math.random, GYM_LIFESPAN_MS);
    setOverrides((current) => ({ ...current, [2 * walk.pair]: walk.to[0], [2 * walk.pair + 1]: walk.to[1] }));
    setWalks(rest);
  }, []);

  const away = (pair: number) => walks.some((walk) => walk.pair === pair);
  return { shown, walks, holds: [h0, h1, h2, h3, h4], racks, onDone, away };
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
  const layout = useMemo(() => getGymLayout(stage), [stage]);
  const hall = layout.hallLevel >= 0;
  const judges = stage >= JUDGES_STAGE;
  const view = hall ? VIEW.hall : VIEW.gym;
  const viewBox = `${view.x} ${view.y} ${view.w} ${view.h}`;
  const match = useGymMatch();
  const reading = useJudgeReading(match.points);
  const rack = useRackSwaps(stage >= 1 && fighterCount >= 2, fighterCount, rarityCounts, layout);
  const sabers = rack.shown.map((rarity) => GYM_SABER_COLORS[rarity]);
  const slotX = layout.pairSpots.flatMap((x) => [x, x + PAIR_GAP]);

  return (
    <figure className="gym-scene">
      {/* Static scenery in two SVGs (behind and in front of the light beams);
          everything that moves is a layer of its own (GymLayers.tsx). From the
          Palazzetto the scenery is the hall's (GymHallScenery.tsx). */}
      <div
        className={hall ? "gym-stage is-hall" : "gym-stage"}
        style={{ "--vb-cx": view.x + view.w / 2, "--vb-cy": view.y + view.h / 2, "--vb-w": view.w, "--vb-h": view.h } as CSSProperties}
      >
        <svg className="gym-backdrop" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {hall ? <HallBackdrop level={layout.hallLevel} /> : (
            <>
              <defs>
                <linearGradient id="gym-wall" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#034965" />
                  <stop offset="1" stopColor="#0a3a57" />
                </linearGradient>
              </defs>
              {/* Wall and floor run past the viewBox so wide panels have no letterbox. */}
              <rect x="-1000" y={view.y} width="2640" height={180 - view.y} fill="url(#gym-wall)" />
              <rect x="620" y="30" width="120" height="58" rx="3" className="gym-window" />
              <path d="M680 30 V88 M620 59 H740" className="gym-window-frame" />
              <rect x="-130" y="62" width="44" height="88" rx="2" className="gym-door" />
              <rect x="-1000" y="150" width="2640" height="80" className="gym-floor" />
              <path d="M-1000 162 H1640 M-1000 172 H1640 M-80 150 L-140 180 M80 150 L40 180 M200 150 L180 180 M320 150 V180 M440 150 L460 180 M560 150 L600 180 M720 150 L780 180" className="gym-floor-lines" />
            </>
          )}
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

        {hall ? <HallLights layout={layout} /> : null}

        <svg className="gym-backdrop" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {hall ? <HallFront layout={layout} /> : (
            <>
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
            </>
          )}
        </svg>

        {hall ? <HallHaze /> : null}

        {/* Walkers come before the pairs: in the back lane they pass behind them (concept V2). */}
        {rack.walks.map((walk) => (
          <GymRackSwap
            key={walk.id}
            id={walk.id}
            homes={[slotX[2 * walk.pair], slotX[2 * walk.pair + 1]]}
            sabers={walk.sabers}
            rack={rack.racks[walk.side > 0 ? 0 : 1]}
            side={walk.side}
            onDone={rack.onDone}
          />
        ))}
        {/* Each rack's body is a layer above the walker, who goes behind it; the left
            rack (from the Arena delle Onde) mirrors the right one. Its blades hum in
            two alternating groups (odd ones 2 s ahead). */}
        {stage >= 1
          ? layout.racks.map((side) => (
              <Fragment key={side}>
                <GymLayer box={mirrorBox(RACK_BODY_BOX, side)} className="gym-rack">
                  <rect x={mirrorX(side > 0 ? 760 : 810, side)} y="96" width="50" height="54" rx="2" />
                </GymLayer>
                {[0, 1].map((parity) => (
                  <SaberLayers
                    key={parity}
                    box={mirrorBox(RACK_BOX, side)}
                    lines={RACK_SABERS.flatMap((color, index) => index % 2 === parity
                      ? [[mirrorX(768 + index * 8.5, side), 140, mirrorX(768 + index * 8.5, side), 100, color] as [number, number, number, number, string]]
                      : [])}
                    delay={side > 0 ? (parity ? "-2s" : undefined) : (parity ? "-1s" : "-3s")}
                  />
                ))}
              </Fragment>
            ))
          : null}

        {judges ? <GymReferees card={match.card} styleJudgeUp={match.judgeUp} reading={reading} xs={layout.judgeXs} /> : null}

        {fighterCount === 1 ? <GymActor x={320} facing={1} saber={sabers[0]} pose="guard" /> : null}
        {fighterCount >= 2 ? (
          <GymBoutPair
            leftX={layout.pairSpots[0]}
            rightX={layout.pairSpots[0] + PAIR_GAP}
            sabers={[sabers[0], sabers[1]]}
            onPoint={match.onPoint}
            hold={rack.holds[0]}
            away={[rack.away(0), rack.away(0)]}
          />
        ) : null}
        {layout.pairSpots.slice(1, Math.floor(fighterCount / 2)).map((x, index) => (
          <GymPair
            key={x}
            leftX={x}
            rightX={x + PAIR_GAP}
            sabers={[sabers[(index + 1) * 2], sabers[(index + 1) * 2 + 1]]}
            index={index + 1}
            hold={rack.holds[index + 1]}
            away={[rack.away(index + 1), rack.away(index + 1)]}
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
