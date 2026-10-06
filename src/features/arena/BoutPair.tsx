import type { CSSProperties } from "react";
import { Fighter } from "../people/GymPair";
import type { BoutEffect, BoutSide, BoutStage, BoutView, DroppedSaber } from "./boutChoreography";

function Effect({ effect }: { effect: BoutEffect }) {
  switch (effect.kind) {
    case "clash":
      return (
        <g transform={`translate(${effect.x} ${effect.y})`}>
          <g className="gym-clash"><path d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2 Z" /></g>
        </g>
      );
    case "touch":
      return (
        <g transform={`translate(${effect.x} ${effect.y})`}>
          <g className="fd-touch"><circle r={5} /><circle r={9} /></g>
        </g>
      );
    case "oh":
      return <text className="fd-oh" x={effect.x} y={effect.y} textAnchor="middle">OH!</text>;
    case "tech":
      return (
        <text className="fd-tech" x={effect.x} y={effect.y} textAnchor="middle">
          {effect.moment.name}
          <tspan className="fd-tech-sub" x={effect.x} dy={11}>
            {[effect.moment.kind, effect.moment.form].filter(Boolean).join(" · ")}
          </tspan>
        </text>
      );
  }
}

/** Disarmo: the sword spins through the air and lands flat behind its owner (CSS, final-duel.css). */
function Dropped({ saber, color }: { saber: DroppedSaber; color: string }) {
  const [bx, by] = saber.blade;
  return (
    <g transform={`translate(${saber.x} ${saber.y})`}>
      <g
        className="fd-dropped"
        style={{ "--dx": `${saber.dx}px`, "--floor": `${saber.floor}px`, "--spin": `${saber.spin}deg` } as CSSProperties}
      >
        <line className="gym-saber" x1={0} y1={0} x2={bx} y2={by} style={{ color }} />
        <line className="fd-hilt" x1={0} y1={0} x2={-bx * 0.18} y2={-by * 0.18} />
      </g>
    </g>
  );
}

/**
 * The two athletes of a bout drawn from a BoutView (boutChoreography.ts): the
 * Arena final and the central pair of the gym show the same fight.
 */
export function BoutPair({
  view,
  stage,
  sabers,
}: {
  view: BoutView;
  stage: BoutStage;
  sabers: Record<BoutSide, string>;
}) {
  const fighter = (side: BoutSide) => {
    const pose = view.poses[side];
    return (
      <g className="gym-step" style={{ transform: `translateX(${view.steps[side === "a" ? 0 : 1]}px)` }}>
        {/* A new key replays the flinch when the blade lands. */}
        <g key={view.hit[side]} className={view.hit[side] ? "fd-hit" : undefined}>
          <Fighter
            x={side === "a" ? stage.left : stage.right}
            facing={side === "a" ? 1 : -1}
            saber={sabers[side]}
            pose={pose.pose}
            tip={pose.tip}
            declare={pose.declare}
            unarmed={pose.unarmed}
            body={pose.body}
            delay={side === "a" ? 0 : 1.7}
          />
        </g>
      </g>
    );
  };
  return (
    <>
      {fighter("a")}
      {fighter("b")}
      {view.dropped ? <Dropped saber={view.dropped} color={sabers[view.dropped.side]} /> : null}
      {view.effects.map((effect) => <Effect key={effect.id} effect={effect} />)}
    </>
  );
}
