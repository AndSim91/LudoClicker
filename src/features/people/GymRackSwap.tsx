import { useEffect, useState, type CSSProperties } from "react";
import { athleteWalk } from "./athleteShape";
import { GymLayer, SaberLayers } from "./GymLayers";

/** Where the athlete stops, just left of the rack (GymScene draws it at 760–810). */
export const RACK_STOP_X = 742;
/** Behind the rack, where one athlete leaves and the other comes out. */
const BEHIND_X = 800;
/** Walking speed in scene units per second. */
const WALK_SPEED = 100;

type Phase = "out" | "rack-out" | "behind" | "gone" | "in" | "rack-in" | "back";

/** What each phase looks like and how long it lasts (walks scale with the distance). */
function phaseOf(phase: Phase, fromX: number) {
  const walkMs = (to: number) => Math.round((Math.abs(to - fromX) / WALK_SPEED) * 1_000);
  const toRack = RACK_STOP_X - fromX;
  const behind = BEHIND_X - fromX;
  switch (phase) {
    case "out": return { dx: toRack, ms: walkMs(RACK_STOP_X), facing: 1, blade: true, shown: true, walking: true } as const;
    case "rack-out": return { dx: toRack, ms: 1_100, facing: 1, blade: false, shown: true, walking: false } as const;
    case "behind": return { dx: behind, ms: 800, facing: 1, blade: false, shown: false, walking: true } as const;
    case "gone": return { dx: behind, ms: 800, facing: -1, blade: false, shown: false, walking: false } as const;
    case "in": return { dx: toRack, ms: 800, facing: -1, blade: false, shown: true, walking: true } as const;
    case "rack-in": return { dx: toRack, ms: 800, facing: -1, blade: true, shown: true, walking: false } as const;
    case "back": return { dx: 0, ms: walkMs(RACK_STOP_X), facing: -1, blade: true, shown: true, walking: true } as const;
  }
}

const NEXT: Record<Phase, Phase | null> = {
  out: "rack-out", "rack-out": "behind", behind: "gone", gone: "in", in: "rack-in", "rack-in": "back", back: null,
};

/**
 * Concept R1 «Dietro la rastrelliera» (13/10): the athlete closest to the rack
 * walks there, rests the blade and goes behind it; another comes out, takes a
 * blade of another colour and walks back to the same spot. Compositor layers
 * only: the walk is a transform, the legs and the blade cross-fade.
 */
export function GymRackSwap({
  fromX,
  sabers,
  onDone,
}: {
  fromX: number;
  /** The blade going to the rack and the one coming back. */
  sabers: [string, string];
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("out");
  const look = phaseOf(phase, fromX);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = NEXT[phase];
      if (next) setPhase(next);
      else onDone();
    }, look.ms);
    return () => window.clearTimeout(timer);
  }, [phase, look.ms, onDone]);

  const shape = athleteWalk(fromX, look.facing);
  const box = { x: fromX - 34, y: 84, w: 68, h: 72 };
  const saber = phase === "out" || phase === "rack-out" || phase === "behind" ? sabers[0] : sabers[1];
  return (
    <div
      className={look.walking ? "gym-walker is-walking" : "gym-walker"}
      style={{ "--dx": look.dx, "--walk-ms": `${look.ms}ms`, opacity: look.shown ? 1 : 0 } as CSSProperties}
    >
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
  );
}
