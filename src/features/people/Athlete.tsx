import { ATHLETE_HEAD_R, ATHLETE_INK, type AthleteShape } from "./athleteShape";

type Line = [number, number, number, number];

/** A lit blade drawn still: glow, colour and a white core (no animation). */
export function StillSaber({ line: [x1, y1, x2, y2], color, width = 4 }: { line: Line; color: string; width?: number }) {
  return (
    <g strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width * 2} opacity={0.28} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={width * 0.4} opacity={0.7} />
    </g>
  );
}

/**
 * The game's stick athlete drawn still, for scenes and pictures (the roll-up,
 * the events). The Arena final and the gym animate the same figure (Fighter).
 */
export function Athlete({ shape, saber, ink = ATHLETE_INK }: { shape: AthleteShape; saber?: string; ink?: string }) {
  return (
    <g>
      {shape.tail ? <path d={shape.tail} fill="none" stroke={ink} strokeWidth={3.6} strokeLinecap="round" /> : null}
      <circle cx={shape.head[0]} cy={shape.head[1]} r={ATHLETE_HEAD_R} fill={ink} />
      <path d={shape.d} fill="none" stroke={ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      {shape.blade && saber ? <StillSaber line={shape.blade} color={saber} /> : null}
      {shape.hilt ? (
        <line x1={shape.hilt[0]} y1={shape.hilt[1]} x2={shape.hilt[2]} y2={shape.hilt[3]} stroke="#3a4450" strokeWidth={3.4} strokeLinecap="round" />
      ) : null}
    </g>
  );
}
