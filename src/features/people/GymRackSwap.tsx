import { useEffect, useState, type CSSProperties } from "react";
import { athleteWalk } from "./athleteShape";
import { GymLayer, SaberLayers } from "./GymLayers";

/** Where the athlete stops, just left of the rack (GymScene draws it at 760–810). */
export const RACK_STOP_X = 742;
/** A few steps before the rack, where the next athlete waits for their turn. */
const QUEUE_X = RACK_STOP_X - 40;
/** Behind the rack, where one athlete leaves and the other comes out. */
const BEHIND_X = 800;
/** Walking speed in scene units per second. */
const WALK_SPEED = 100;
/** Concept V2 «Corsia di fondo»: a step back, a little smaller and fainter, behind the pairs. */
const BACK_LANE = { dy: -9, scale: 0.86, dim: 0.6 };

/**
 * The rack takes one athlete at a time, from the approach to the new blade:
 * `claim` returns whether this walker has it (or already had it).
 */
export interface RackTurns {
  claim: (id: number) => boolean;
  release: (id: number) => void;
}

type Phase =
  | "start" | "leave" | "out" | "queue" | "approach" | "rack-out" | "behind" | "gone"
  | "in" | "rack-in" | "backstep" | "back" | "arrive";

const ORDER: Phase[] = [
  "start", "leave", "out", "queue", "approach", "rack-out", "behind", "gone", "in", "rack-in", "backstep", "back", "arrive",
];

interface Look {
  /** Target x of the walk, in scene units. */
  x: number;
  ms: number;
  lane: "front" | "back";
  facing: 1 | -1;
  blade: boolean;
  shown: boolean;
  walking: boolean;
}

/** What each phase looks like and how long it lasts (walks scale with the distance). */
function phaseLook(phase: Phase, homeX: number): Look {
  const walk = (from: number, to: number) => Math.round((Math.abs(to - from) / WALK_SPEED) * 1_000);
  const outbound = { facing: 1, blade: true, shown: true, walking: true } as const;
  const inbound = { facing: -1, blade: true, shown: true, walking: true } as const;
  switch (phase) {
    // A new element has no previous position to animate from: it is drawn on
    // its spot first, and only the next phase moves it (no jump to the rack).
    case "start": return { ...outbound, x: homeX, ms: 80, lane: "front", walking: false };
    case "leave": return { ...outbound, x: homeX + 14, ms: 350, lane: "back" };
    case "out": return { ...outbound, x: QUEUE_X, ms: walk(homeX + 14, QUEUE_X), lane: "back" };
    case "queue": return { ...outbound, x: QUEUE_X, ms: 250, lane: "back", walking: false };
    case "approach": return { ...outbound, x: RACK_STOP_X, ms: 450, lane: "front" };
    case "rack-out": return { ...outbound, x: RACK_STOP_X, ms: 1_100, lane: "front", blade: false, walking: false };
    case "behind": return { ...outbound, x: BEHIND_X, ms: 800, lane: "front", blade: false, shown: false };
    case "gone": return { ...inbound, x: BEHIND_X, ms: 800, lane: "front", blade: false, shown: false, walking: false };
    case "in": return { ...inbound, x: RACK_STOP_X, ms: 800, lane: "front", blade: false };
    case "rack-in": return { ...inbound, x: RACK_STOP_X, ms: 800, lane: "front", walking: false };
    case "backstep": return { ...inbound, x: RACK_STOP_X - 30, ms: 400, lane: "back" };
    case "back": return { ...inbound, x: homeX + 14, ms: walk(RACK_STOP_X - 30, homeX + 14), lane: "back" };
    case "arrive": return { ...inbound, x: homeX, ms: 350, lane: "front" };
  }
}

/**
 * Concepts R1 «Dietro la rastrelliera» + V2 «Corsia di fondo» (13/10): an
 * athlete walks behind the pairs to the rack, rests the blade and goes behind
 * it; another comes out, takes a blade of another colour and walks back to the
 * same spot. If the rack is taken, they wait a few steps before it. Compositor
 * layers only: the walk is a transform, the legs and the blade cross-fade.
 */
export function GymRackSwap({
  id,
  homeX,
  sabers,
  rack,
  onDone,
}: {
  id: number;
  homeX: number;
  /** The blade going to the rack and the one coming back. */
  sabers: [string, string];
  rack: RackTurns;
  onDone: (id: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("start");
  const look = phaseLook(phase, homeX);

  useEffect(() => {
    if (phase === "backstep") rack.release(id);
    const next = () => {
      const following = ORDER[ORDER.indexOf(phase) + 1];
      if (following) setPhase(following);
      else onDone(id);
    };
    if (phase === "queue") {
      // Wait in line until the rack is free (or already ours), then step up.
      const poll = window.setInterval(() => {
        if (!rack.claim(id)) return;
        window.clearInterval(poll);
        next();
      }, look.ms);
      return () => window.clearInterval(poll);
    }
    const timer = window.setTimeout(next, look.ms);
    return () => window.clearTimeout(timer);
  }, [phase, look.ms, id, rack, onDone]);

  // Leaving the scene halfway (a new layout) frees the rack.
  useEffect(() => () => rack.release(id), [id, rack]);

  const shape = athleteWalk(homeX, look.facing);
  const box = { x: homeX - 34, y: 84, w: 68, h: 72 };
  const saber = ORDER.indexOf(phase) <= ORDER.indexOf("behind") ? sabers[0] : sabers[1];
  const back = look.lane === "back";
  return (
    <div
      className={look.walking ? "gym-walker is-walking" : "gym-walker"}
      style={{
        "--dx": look.x - homeX,
        "--dy": back ? BACK_LANE.dy : 0,
        "--k": back ? BACK_LANE.scale : 1,
        "--home-x": homeX,
        "--walk-ms": `${look.ms}ms`,
        opacity: look.shown ? 1 : 0,
      } as CSSProperties}
    >
      <div className="gym-walker-lane" style={{ opacity: back ? BACK_LANE.dim : 1 }}>
        <GymLayer box={box} className="gym-body">
          <circle cx={shape.head[0]} cy={shape.head[1]} r={7} />
          <path d={shape.d} />
        </GymLayer>
        <GymLayer box={box} className="gym-body gym-walk-a"><path d={shape.legs[0]} /></GymLayer>
        <GymLayer box={box} className="gym-body gym-walk-b"><path d={shape.legs[1]} /></GymLayer>
        <div className="gym-walker-blade" style={{ opacity: look.blade ? 1 : 0 }}>
          <SaberLayers box={box} lines={[[...shape.blade, saber]]} />
        </div>
      </div>
    </div>
  );
}
