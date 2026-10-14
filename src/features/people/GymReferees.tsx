import type { CSSProperties } from "react";
import { GymLayer } from "./GymLayers";
import type { GymCard } from "./gymMatch";
import { JudgeFigure } from "./JudgeFigure";
import { judgeChair, judgeShape, type JudgeKind, type JudgePose } from "./judgeShape";

/** A card being raised: the id restarts the animation for the next one. */
export interface RaisedCard {
  id: number;
  card: GymCard;
}

const CARD_FILL: Record<GymCard, string> = { style: "url(#gym-checker)", white: "#f5f3ee", yellow: "#ffd166" };

/**
 * One of the two judges at the edge of the Arena (from 500 iscritti). The one
 * with the phone sits on a chair and raises the chequered Style card, the one
 * in the Order's blue T-shirt stands and raises the white or the yellow card; a
 * card exists only while it is raised. The figure comes from judgeShape.ts.
 */
function GymJudge({
  x,
  kind,
  pose,
  reading = false,
  raised,
}: {
  x: number;
  kind: JudgeKind;
  pose: JudgePose;
  reading?: boolean;
  raised?: RaisedCard;
}) {
  // Both face the Arena: the phone judge is on the left, the other on the right.
  const f = kind === "phone" ? 1 : -1;
  // A raised Style card wins: the judge reads Servizio again once it is down.
  const reads = reading && !raised;
  const shape = judgeShape(kind, pose, x, f, reads);
  const [sx, sy] = shape.shoulder;
  return (
    <GymLayer box={{ x: x - 26, y: 66, w: 52, h: 88 }} className={`gym-judge is-${kind}`}>
      {kind === "phone" ? (
        <pattern id="gym-checker" width={6} height={6} patternUnits="userSpaceOnUse">
          <rect width={6} height={6} fill="#ffd166" />
          <rect width={3} height={3} fill="#111417" />
          <rect x={3} y={3} width={3} height={3} fill="#111417" />
        </pattern>
      ) : null}
      {kind === "phone" ? <path className="gym-judge-chair" d={judgeChair(x, f)} /> : null}
      {/* The key replays the settle animation when the judge sits down or gets up. */}
      <g key={pose} className="gym-judge-pose">
        <JudgeFigure
          shape={shape}
          prefix="gym-judge"
          reading={reads}
          cardArm={!raised}
          wear={kind === "shirt" ? (
            <>
              <path className="gym-judge-shirt" d={`M${x - 6} 106 H${x + 6} L${x + 12} 113 L${x + 8} 116 L${x + 6} 114 V128 H${x - 6} V114 L${x - 8} 116 L${x - 12} 113 Z`} />
              <path className="gym-judge-mark" d={`M${x + 2} 110 V115`} />
            </>
          ) : null}
        />
      </g>
      {raised ? (
        <g
          key={raised.id}
          className="gym-judge-card"
          style={{ transformOrigin: `${sx}px ${sy}px`, "--down": `${75 * f}deg` } as CSSProperties}
        >
          <path className="gym-judge-limb" d={`M${sx} ${sy} L${sx + 12 * f} ${sy - 14} L${sx + 14 * f} ${sy - 26}`} />
          <rect x={sx + (f > 0 ? 7 : -21)} y={sy - 39} width={14} height={13} fill={CARD_FILL[raised.card]} className="gym-judge-cardface" />
        </g>
      ) : null}
    </GymLayer>
  );
}

export function GymReferees({
  card,
  styleJudgeUp = false,
  reading = false,
  xs = [100, 550],
}: {
  /** Where the two judges stand: next to the central Arena, closer at the championship. */
  xs?: [number, number];
  card?: RaisedCard;
  styleJudgeUp?: boolean;
  /** The Style judge is writing on Servizio after a point. */
  reading?: boolean;
}) {
  return (
    <>
      <GymJudge x={xs[0]} kind="phone" pose={styleJudgeUp ? "standing" : "seated"} reading={reading} raised={card?.card === "style" ? card : undefined} />
      <GymJudge x={xs[1]} kind="shirt" pose="standing" raised={card && card.card !== "style" ? card : undefined} />
    </>
  );
}
