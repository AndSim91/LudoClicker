import { useId, type CSSProperties } from "react";
import type { TournamentLevel } from "../../game/types";
import { Fighter } from "../people/GymPair";
import type { DuelSide } from "./finalDuel";
import { FinalArenaBackdrop } from "./FinalArenaBackdrop";
import { DUEL_LEFT, DUEL_RIGHT, type DuelEffect, type DuelView } from "./finalDuelTimeline";

const JUDGE_SPOTS: Record<number, [number, number][]> = {
  1: [[96, 216]],
  2: [[96, 216], [544, 216]],
  4: [[96, 216], [196, 198], [444, 198], [544, 216]],
};

/** A Style judge with Servizio in hand; the chequered card goes up on a penalty. */
function Judge({ x, y, carding, checker }: { x: number; y: number; carding: number; checker: string }) {
  return (
    <g className="fd-judge" transform={`translate(${x} ${y}) scale(.8)`}>
      <circle cx={0} cy={-60} r={6} />
      <path d="M0 -53 L0 -32 M0 -32 L-6 -14 M0 -32 L7 -14 M0 -48 L8 -44" />
      <rect className="fd-judge-phone" x={7} y={-50} width={6} height={9} rx={1.5} />
      {carding > 0 ? (
        <g key={carding} className="fd-judge-card">
          <rect x={-16} y={-100} width={14} height={19} rx={1.5} fill={`url(#${checker})`} stroke="#fbf1dc" strokeWidth={1} />
          <path d="M-6 -82 L-2 -50" />
        </g>
      ) : null}
    </g>
  );
}

function Effect({ effect }: { effect: DuelEffect }) {
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

/** The Arena of «Guarda la finale», drawn from the current DuelView. */
export function FinalArena({
  level,
  view,
  judges,
  sabers,
}: {
  level: TournamentLevel;
  view: DuelView;
  judges: number;
  sabers: Record<DuelSide, string>;
}) {
  const checker = `fd-checker-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const fighter = (side: DuelSide) => {
    const pose = view.poses[side];
    return (
      <g className="gym-step" style={{ transform: `translateX(${view.steps[side === "a" ? 0 : 1]}px)` }}>
        {/* A new key replays the flinch when the blade lands. */}
        <g key={view.hit[side]} className={view.hit[side] ? "fd-hit" : undefined}>
          <Fighter
            x={side === "a" ? DUEL_LEFT : DUEL_RIGHT}
            facing={side === "a" ? 1 : -1}
            saber={sabers[side]}
            pose={pose.pose}
            tip={pose.tip}
            declare={pose.declare}
            delay={side === "a" ? 0 : 1.7}
          />
        </g>
      </g>
    );
  };
  return (
    <svg className="fd-arena" viewBox="0 0 640 300" aria-hidden="true">
      <defs>
        <pattern id={checker} width={6} height={6} patternUnits="userSpaceOnUse">
          <rect width={6} height={6} fill="#111417" />
          <rect width={3} height={3} fill="#f3cf3e" />
          <rect x={3} y={3} width={3} height={3} fill="#f3cf3e" />
        </pattern>
      </defs>
      <FinalArenaBackdrop level={level} />
      {(JUDGE_SPOTS[judges] ?? JUDGE_SPOTS[2]).map(([x, y]) => (
        <Judge key={x} x={x} y={y} carding={view.carding} checker={checker} />
      ))}
      <g
        className={view.fighting ? "gym-pair is-sparring" : "gym-pair"}
        transform="translate(-112 33) scale(1.35)"
        style={{ "--gym-move": `${view.moveMs}ms` } as CSSProperties}
      >
        {fighter("a")}
        {fighter("b")}
        {view.effects.map((effect) => <Effect key={effect.id} effect={effect} />)}
      </g>
    </svg>
  );
}
