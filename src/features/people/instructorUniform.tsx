/*
 * The instructor's uniform (concept N5, Andrea 14/10), from the LudoSport uniforms: a
 * black kimono over the under-tunic in the colour of the role, both cut as an
 * upside-down V between the legs (the kimono's cut wider, so both show), a deep V
 * collar, the brown belt with its hanging end and the braid, black trousers with the
 * white LudoSport logo along the front leg, white soles, gloves. Scene units: the
 * figure stands on x, shoulders at 110, hips at 128, feet at 150.
 */

const KIMONO = "#0b1015";
const KIMONO_EDGE = "#3d4f5e";
const BELT = "#5b3a22";
const WHITE = "#eef3f6";

/** The LudoSport logo (split blade, two side points, the arch), `h` tall, centred on (x, y). */
export function LudoLogo({ x, y, h, angle = 0 }: { x: number; y: number; h: number; angle?: number }) {
  return (
    <g fill={WHITE} transform={`translate(${x} ${y}) rotate(${angle}) scale(${h / 300}) translate(-60 -150)`}>
      <path d="M59 6 C55 50 51.5 105 51.5 154 L59 154 Z" />
      <path d="M61 6 C65 50 69.5 105 69.5 154 L61 154 Z" />
      <path d="M52 152 L69.5 152 L64.5 238 L56.5 238 Z" />
      <path d="M40 164 C43 200 43 226 38.5 240 C34 252 28 260 22 265 C16 267 11 261 10 252 C23 236 34 210 40 164 Z" />
      <path d="M80 164 C77 200 77 226 81.5 240 C86 252 92 260 98 265 C104 267 109 261 110 252 C97 236 86 210 80 164 Z" />
      <path d="M27 288 C27 262 43 246 60 246 C77 246 93 262 93 288 L89 288 C88 270 76 258 60 258 C44 258 32 270 31 288 Z" />
    </g>
  );
}

/** The instructor's braid (concept T1, 13/10): short, the belt's brown, half width. */
function Braid({ x, f }: { x: number; f: 1 | -1 }) {
  const kx = x + 4.5 * f;
  return (
    <g fill="none" stroke={BELT} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
      {[0, 2.4, 4.8, 7.2].map((y) => <path key={y} d={`M${kx - 0.65} ${123 + y} L${kx} ${124.6 + y} L${kx + 0.65} ${123 + y}`} />)}
      <circle cx={kx} cy={122} r={1} fill={BELT} stroke="none" />
    </g>
  );
}

/** The standing legs' details (athleteBody): the logo along the front leg, the white soles. */
export function TrouserDetails({ x }: { x: number }) {
  return (
    <>
      <LudoLogo x={x - 5.3} y={142.5} h={6} angle={20} />
      <rect x={x - 11.7} y={148.6} width={7} height={2.8} rx={1.2} fill={WHITE} />
      <rect x={x + 5.6} y={148.6} width={7} height={2.8} rx={1.2} fill={WHITE} />
    </>
  );
}

/** Kimono, under-tunic, collar and belt, between the legs and the head. */
export function Uniform({ x, f, color }: { x: number; f: 1 | -1; color: string }) {
  return (
    <>
      <path d={`M${x - 7} 106 L${x + 7} 106 L${x + 9.4} 140 L${x + 2.2} 140 L${x} 130 L${x - 2.2} 140 L${x - 9.4} 140 Z`} fill={color} />
      <path
        d={`M${x - 8.4} 102.6 Q${x} 100.8 ${x + 8.4} 102.6 L${x + 10.8} 140 L${x + 4.8} 140 L${x} 124 L${x - 4.8} 140 L${x - 10.8} 140 Z`}
        fill={KIMONO}
        stroke={KIMONO_EDGE}
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      <path d={`M${x - 4.4} 102.4 L${x + 4.4} 102.4 L${x} 114 Z`} fill={color} />
      <path d={`M${x - 4.6 * f} 102.6 L${x + 3.6 * f} 117.6 M${x + 4.6 * f} 102.6 L${x + 0.4 * f} 113.6`} stroke={KIMONO_EDGE} strokeWidth={0.9} fill="none" />
      <rect x={x - 10.6} y={119} width={21.2} height={3.6} rx={1} fill={BELT} />
      <path d={`M${x + 6.8 * f} 122.4 Q${x + 7.6 * f} 127 ${x + 7.2 * f} 134`} stroke={BELT} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Braid x={x} f={f} />
    </>
  );
}

/**
 * The wide kimono sleeve over an arm from the shoulder to the hand: it follows the arm
 * to the elbow and hangs from it, with the logo on it; the black glove on the hand.
 * Drawn after the arm, in the arm's own layer, so it moves with it.
 */
export function Sleeve({ shoulder, hand, f }: { shoulder: [number, number]; hand: [number, number]; f: 1 | -1 }) {
  const [sx, sy] = shoulder;
  const dx = hand[0] - sx;
  const dy = hand[1] - sy;
  const length = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / length, dy / length];
  // The side of the arm that faces up.
  const [px, py] = -ux <= 0 ? [uy, -ux] : [-uy, ux];
  const ex = sx + ux * length * 0.62;
  const ey = sy + uy * length * 0.62;
  const point = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`;
  const d = [
    `M${point(sx + px * 3.6, sy + py * 3.6)}`,
    `L${point(ex + px * 3.2, ey + py * 3.2)}`,
    `L${point(ex - px * 3.2, ey - py * 3.2 + 6.5)}`,
    `L${point(sx - px * 3.2, sy - py * 3.2 + 2)}`,
    "Z",
  ].join(" ");
  return (
    <>
      <path d={d} fill={KIMONO} stroke={KIMONO_EDGE} strokeWidth={0.6} strokeLinejoin="round" />
      <LudoLogo x={sx + ux * 5.2} y={sy + uy * 5.2 + 1.4} h={5.6} angle={20 * f} />
      <circle cx={hand[0]} cy={hand[1]} r={2.9} fill="#05080b" />
    </>
  );
}
