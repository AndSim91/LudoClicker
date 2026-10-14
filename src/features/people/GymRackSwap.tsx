import { useEffect, useState, type CSSProperties } from "react";
import { athleteWalk } from "./athleteShape";
import { GymLayer, SaberLayers } from "./GymLayers";
import { mirrorX, type RackSide } from "./gymHall";

/**
 * The right rack (GymScene draws it at 760–810): where the athlete stops, just left
 * of it, and where one athlete leaves and the other comes out, behind it. The left
 * rack (from the Arena delle Onde) is its mirror, x → 640 − x (gymHall.ts).
 */
const RACK_STOP_X = 742;
const BEHIND_X = 800;
/** A few steps before the rack, where the next athlete waits for their turn. */
const QUEUE_STEPS = 40;
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
  /** Target x of each athlete's walk, in scene units. */
  xs: number[];
  ms: number;
  lane: "front" | "back";
  facing: 1 | -1;
  blade: boolean;
  shown: boolean;
  walking: boolean;
}

/** Room between two athletes walking together; the rightmost leads. */
const PAIR_GAP = 36;

/**
 * What each phase looks like and how long it lasts. A pair walks together: at
 * the rack and in line the rightmost athlete leads and the other one keeps
 * PAIR_GAP behind; a walk lasts as long as the longer of the two.
 */
function phaseLook(phase: Phase, homes: number[], side: RackSide): Look {
  const stop = mirrorX(RACK_STOP_X, side);
  const queue = stop - QUEUE_STEPS * side;
  const hidden = mirrorX(BEHIND_X, side);
  const order = [...homes].sort((a, b) => a - b);
  // The athlete nearer the rack leads, the other keeps PAIR_GAP behind.
  const behind = homes.map((home) => PAIR_GAP * (side > 0 ? homes.length - 1 - order.indexOf(home) : order.indexOf(home)));
  const at = (x: number) => homes.map((_, index) => x - side * behind[index]);
  const fromHome = (dx: number) => homes.map((home) => home + dx * side);
  const walk = (from: number[], to: number[]) =>
    Math.max(...from.map((x, index) => Math.round((Math.abs(to[index] - x) / WALK_SPEED) * 1_000)));
  const outbound = { facing: side, blade: true, shown: true, walking: true } as const;
  const inbound = { facing: -side as RackSide, blade: true, shown: true, walking: true } as const;
  switch (phase) {
    // A new element has no previous position to animate from: it is drawn on
    // its spot first, and only the next phase moves it (no jump to the rack).
    case "start": return { ...outbound, xs: homes, ms: 80, lane: "front", walking: false };
    case "leave": return { ...outbound, xs: fromHome(14), ms: 350, lane: "back" };
    case "out": return { ...outbound, xs: at(queue), ms: walk(fromHome(14), at(queue)), lane: "back" };
    case "queue": return { ...outbound, xs: at(queue), ms: 250, lane: "back", walking: false };
    case "approach": return { ...outbound, xs: at(stop), ms: 450, lane: "front" };
    case "rack-out": return { ...outbound, xs: at(stop), ms: 1_100, lane: "front", blade: false, walking: false };
    case "behind": return { ...outbound, xs: homes.map(() => hidden), ms: 1_000, lane: "front", blade: false, shown: false };
    case "gone": return { ...inbound, xs: homes.map(() => hidden), ms: 800, lane: "front", blade: false, shown: false, walking: false };
    case "in": return { ...inbound, xs: at(stop), ms: 1_000, lane: "front", blade: false };
    case "rack-in": return { ...inbound, xs: at(stop), ms: 800, lane: "front", walking: false };
    case "backstep": return { ...inbound, xs: at(stop - 30 * side), ms: 400, lane: "back" };
    case "back": return { ...inbound, xs: fromHome(14), ms: walk(at(stop - 30 * side), fromHome(14)), lane: "back" };
    case "arrive": return { ...inbound, xs: homes, ms: 350, lane: "front" };
  }
}

/**
 * Concepts R1 «Dietro la rastrelliera» + V2 «Corsia di fondo» (13/10): a pair
 * walks behind the other pairs to the rack, rests the blades and goes behind
 * it; a new pair comes out, takes blades of other colours and walks back to the
 * same spots. If the rack is taken, they wait a few steps before it. Compositor
 * layers only: the walk is a transform, the legs and the blades cross-fade.
 */
export function GymRackSwap({
  id,
  homes,
  sabers,
  rack,
  onDone,
  side = 1,
}: {
  id: number;
  /** The spots of the athletes walking together (a pair). */
  homes: number[];
  /** For each athlete, the blade going to the rack and the one coming back. */
  sabers: Array<[string, string]>;
  rack: RackTurns;
  onDone: (id: number) => void;
  /** Which rack the pair walks to. */
  side?: RackSide;
}) {
  const [phase, setPhase] = useState<Phase>("start");
  const look = phaseLook(phase, homes, side);

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

  const second = ORDER.indexOf(phase) > ORDER.indexOf("behind");
  const back = look.lane === "back";
  return (
    <>
      {homes.map((homeX, index) => {
        const shape = athleteWalk(homeX, look.facing);
        const box = { x: homeX - 34, y: 84, w: 68, h: 72 };
        return (
          <div
            key={index}
            className={look.walking ? "gym-walker is-walking" : "gym-walker"}
            style={{
              "--dx": look.xs[index] - homeX,
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
                <SaberLayers box={box} lines={[[...shape.blade, sabers[index][second ? 1 : 0]]]} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
