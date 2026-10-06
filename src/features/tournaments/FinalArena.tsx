import { useId, type CSSProperties } from "react";
import { BoutPair } from "../arena/BoutPair";
import type { TournamentLevel } from "../../game/types";
import type { DuelSide } from "./finalDuel";
import { FinalArenaBackdrop } from "./FinalArenaBackdrop";
import { DUEL_LEFT, DUEL_RIGHT, type DuelView } from "./finalDuelTimeline";

const STAGE = { left: DUEL_LEFT, right: DUEL_RIGHT };

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
        <BoutPair view={view} stage={STAGE} sabers={sabers} />
      </g>
    </svg>
  );
}
