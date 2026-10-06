import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BoutPair } from "../arena/BoutPair";
import { applyBoutEvent, planCutBout, startBoutView, type BoutSide, type BoutView } from "../arena/boutChoreography";
import { GymLayer } from "./GymLayers";
import { GymActor } from "./GymPair";
import { GYM_DISARM_CHANCE } from "./gymMatch";
import { canSpar, nextIdleMs, rollsBout } from "./gymSparring";

/**
 * The central pair of the gym (06/10): it breathes like the others, but its
 * bouts are the Arena final's (boutChoreography.ts) and always end with a cut,
 * sometimes after a Disarmo. While a bout runs the pair is one small SVG layer
 * drawn by BoutPair; at rest it goes back to the compositor-only GymActors.
 * The point goes out with the «OH!» (onPoint).
 */
export function GymBoutPair({
  leftX,
  rightX,
  sabers,
  onPoint,
}: {
  leftX: number;
  rightX: number;
  sabers: [string, string];
  onPoint: (side: BoutSide) => void;
}) {
  const [view, setView] = useState<BoutView | null>(null);
  const pointRef = useRef(onPoint);
  useEffect(() => {
    pointRef.current = onPoint;
  }, [onPoint]);

  useEffect(() => {
    const stage = { left: leftX, right: rightX };
    let timers: number[] = [];
    const later = (ms: number, next: () => void) => timers.push(window.setTimeout(next, ms));
    const idle = () => later(nextIdleMs(Math.random), () => {
      timers = []; // everything scheduled before has fired
      if (!canSpar() || !rollsBout(Math.random)) {
        idle();
        return;
      }
      const bout = planCutBout(stage, Math.random, GYM_DISARM_CHANCE);
      setView(startBoutView());
      for (const event of bout.events) {
        later(event.t, () => {
          setView((current) => (current ? applyBoutEvent(current, event) : current));
          if (event.type === "point") pointRef.current(event.side);
        });
      }
      later(bout.durationMs, () => {
        setView(null);
        idle();
      });
    });
    idle();
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [leftX, rightX]);

  if (!view) {
    return (
      <div className="gym-pair">
        <GymActor x={leftX} facing={1} saber={sabers[0]} delay={0} />
        <GymActor x={rightX} facing={-1} saber={sabers[1]} delay={1.7} />
      </div>
    );
  }
  // Room for the footwork, the «OH!» above the heads and the sword flying behind.
  const box = { x: leftX - 100, y: 40, w: rightX - leftX + 200, h: 120 };
  return (
    <GymLayer box={box} className="gym-bout">
      <g className="gym-pair is-sparring" style={{ "--gym-move": `${view.moveMs}ms` } as CSSProperties}>
        <BoutPair view={view} stage={{ left: leftX, right: rightX }} sabers={{ a: sabers[0], b: sabers[1] }} />
      </g>
    </GymLayer>
  );
}
