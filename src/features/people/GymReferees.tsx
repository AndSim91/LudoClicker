import type { CSSProperties } from "react";
import type { BoutSide } from "../arena/boutChoreography";
import { GymLayer } from "./GymLayers";
import type { GymCard, GymScore } from "./gymMatch";

/** A card being raised: the id restarts the animation for the next one. */
export interface RaisedCard {
  id: number;
  card: GymCard;
}

const CARD_FILL: Record<GymCard, string> = { style: "url(#gym-checker)", white: "#f5f3ee", yellow: "#ffd166" };

/**
 * One of the two judges at the edge of the Arena (from 500 iscritti). The one
 * with the phone raises the chequered Style card, the one in the Order's blue
 * T-shirt the white or the yellow card; a card exists only while it is raised.
 */
function GymJudge({ x, kind, raised }: { x: number; kind: "phone" | "shirt"; raised?: RaisedCard }) {
  // Both face the Arena: the phone judge stands on the left, the other on the right.
  const f = kind === "phone" ? 1 : -1;
  const box = { x: x - 26, y: 66, w: 52, h: 88 };
  const shoulder = { x: kind === "shirt" ? x + 9 * f : x, y: kind === "shirt" ? 114 : 112 };
  return (
    <GymLayer box={box} className={`gym-judge is-${kind}`}>
      {kind === "phone" ? (
        <pattern id="gym-checker" width={6} height={6} patternUnits="userSpaceOnUse">
          <rect width={6} height={6} fill="#ffd166" />
          <rect width={3} height={3} fill="#111417" />
          <rect x={3} y={3} width={3} height={3} fill="#111417" />
        </pattern>
      ) : null}
      <circle className="gym-judge-ink" cx={x} cy={100} r={6.5} />
      <path className="gym-judge-limb" d={`M${x} 107 L${x} 128 M${x} 128 L${x - 7} 150 M${x} 128 L${x + 7} 150`} />
      {kind === "phone" ? (
        <>
          <path className="gym-judge-limb" d={`M${x} 112 L${x - 8} 120 L${x - 5} 125`} />
          <rect className="gym-judge-phone" x={x - 10} y={119} width={6} height={9} rx={1} />
        </>
      ) : (
        <>
          <path className="gym-judge-shirt" d={`M${x - 6} 106 H${x + 6} L${x + 12} 113 L${x + 8} 116 L${x + 6} 114 V128 H${x - 6} V114 L${x - 8} 116 L${x - 12} 113 Z`} />
          <path className="gym-judge-mark" d={`M${x + 2} 110 V115`} />
          <path className="gym-judge-limb" d={`M${x - 9 * f} 115 L${x - 11 * f} 124`} />
        </>
      )}
      {raised ? (
        <g
          key={raised.id}
          className="gym-judge-card"
          style={{ transformOrigin: `${shoulder.x}px ${shoulder.y}px`, "--down": `${75 * f}deg` } as CSSProperties}
        >
          <path className="gym-judge-limb" d={`M${shoulder.x} ${shoulder.y} L${shoulder.x + 12 * f} 98 L${shoulder.x + 14 * f} 86`} />
          <rect x={shoulder.x + (f > 0 ? 7 : -21)} y={73} width={14} height={13} fill={CARD_FILL[raised.card]} className="gym-judge-cardface" />
        </g>
      ) : (
        <path className="gym-judge-limb" d={`M${shoulder.x} ${shoulder.y} L${shoulder.x + 7 * f} 121 L${shoulder.x + 8 * f} 128`} />
      )}
    </GymLayer>
  );
}

export function GymReferees({ card }: { card?: RaisedCard }) {
  return (
    <>
      <GymJudge x={100} kind="phone" raised={card?.card === "style" ? card : undefined} />
      <GymJudge x={550} kind="shirt" raised={card && card.card !== "style" ? card : undefined} />
    </>
  );
}

/** The palazzetto's scoreboard: Player 1 against Player 2, best of 5. */
export function GymScoreboard({ score }: { score: GymScore }) {
  const label = (side: BoutSide) => `Player ${side === "a" ? 1 : 2}`;
  return (
    <GymLayer box={{ x: 440, y: -6, w: 180, h: 56 }} className="gym-scoreboard">
      <path className="gym-scoreboard-wire" d="M466 -6 V8 M594 -6 V8" />
      <rect className="gym-scoreboard-box" x={444} y={8} width={172} height={40} rx={3} />
      <text className="gym-scoreboard-team" x={452} y={21}>{label("a").toUpperCase()}</text>
      <text className="gym-scoreboard-team" x={608} y={21} textAnchor="end">{label("b").toUpperCase()}</text>
      <text className="gym-scoreboard-num" x={520} y={41} textAnchor="end">{score.a}</text>
      <text className="gym-scoreboard-num" x={530} y={40} textAnchor="middle">:</text>
      <text className="gym-scoreboard-num" x={540} y={41}>{score.b}</text>
      <title>{`${label("a")} ${score.a} – ${score.b} ${label("b")}`}</title>
    </GymLayer>
  );
}
