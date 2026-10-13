import { useId, type CSSProperties } from "react";
import { BoutPair } from "../arena/BoutPair";
import type { TournamentLevel } from "../../game/types";
import type { DuelSide } from "./finalDuel";
import { FinalArenaBackdrop } from "./FinalArenaBackdrop";
import { DUEL_LEFT, DUEL_RIGHT, type DuelView } from "./finalDuelTimeline";
import { JudgeFigure } from "../people/JudgeFigure";
import { judgeShape } from "../people/judgeShape";
import { useBriefFlag, useJudgeReading } from "../people/useJudgeReading";

/** How long the chequered card stays up (the fd-card animation). */
const CARD_MS = 1_600;

const STAGE = { left: DUEL_LEFT, right: DUEL_RIGHT };

const JUDGE_SPOTS: Record<number, [number, number][]> = {
  1: [[96, 216]],
  2: [[96, 216], [544, 216]],
  4: [[96, 216], [196, 198], [444, 198], [544, 216]],
};

/**
 * A Style judge with Servizio in hand: the game's judge (judgeShape.ts), turned
 * towards the Arena. After every point he writes on the phone (concept J3); the
 * chequered card goes up on a penalty. Drawn in gym units, feet on the spot.
 */
function Judge({ x, y, carding, checker, reading }: { x: number; y: number; carding: number; checker: string; reading: boolean }) {
  const f = x < 320 ? 1 : -1;
  const cardUp = useBriefFlag(carding, 0, CARD_MS);
  const shape = judgeShape("phone", "standing", 0, f, reading && !cardUp);
  const [sx, sy] = shape.shoulder;
  return (
    <g className="fd-judge" transform={`translate(${x} ${y}) scale(.8) translate(0 -164)`}>
      <JudgeFigure shape={shape} prefix="fd-judge" reading={reading && !cardUp} cardArm={!cardUp} />
      {cardUp ? (
        <g key={carding} className="fd-judge-card">
          <path d={`M${sx} ${sy} L${sx + 12 * f} ${sy - 14} L${sx + 14 * f} ${sy - 26}`} />
          <rect x={sx + (f > 0 ? 7 : -21)} y={sy - 45} width={14} height={19} rx={1.5} fill={`url(#${checker})`} stroke="#fbf1dc" strokeWidth={1} />
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
  const reading = useJudgeReading(view.history.length);
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
        <Judge key={x} x={x} y={y} carding={view.carding} checker={checker} reading={reading} />
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
