import { Athlete } from "./Athlete";
import { athletePose, ponytail, type AthleteShape } from "./athleteShape";

// The school's poster, as a roll-up left of the gazebo (07/10): two athletes
// back to back, the white band with title, text, logo and QR, an athlete at
// sunset in the hanging guard. A roll-up stands still: nothing here moves.
const back = (x: number, facing: 1 | -1): AthleteShape => ({ ...athletePose(x, facing, "guard"), tail: ponytail(x, facing) });

/** Hands high, blade across the body and tip down (drawn facing left, mirrored on the poster). */
const HANGING_GUARD: AthleteShape = {
  head: [5, 98],
  d: "M0 128 L3 105 M0 128 L-10 139 L-16 150 M0 128 L10 139 L15 150 M3 109 L14 93 L-1 80 M3 110 L17 99 L0 81",
  blade: [-0.5, 80.5, -34, 130],
  hilt: [4, 73, -0.5, 80.5],
};

const PAPER = "#fbfaf7";
const ORANGE = "#ef6c1f";

export function EventsRollup() {
  return (
    <g>
      <defs>
        <clipPath id="events-rollup-clip"><rect x={118} y={22} width={30} height={62} rx={1.5} /></clipPath>
        <linearGradient id="events-rollup-eve" x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor="#f6c48e" /><stop offset={0.6} stopColor="#ec9a55" /><stop offset={1} stopColor="#d9741f" />
        </linearGradient>
        <linearGradient id="events-rollup-sun" x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor="#f6c08a" /><stop offset={0.45} stopColor="#e9a06a" /><stop offset={0.75} stopColor="#9fb0b8" /><stop offset={1} stopColor="#7f939d" />
        </linearGradient>
      </defs>
      <rect x={116} y={84} width={34} height={4} rx={1} fill="#8aa0b0" />
      <rect x={118} y={22} width={30} height={62} rx={1.5} fill={PAPER} stroke="#3a4450" strokeWidth={0.8} />
      <g clipPath="url(#events-rollup-clip)">
        <rect x={118} y={22} width={30} height={22} fill="url(#events-rollup-eve)" />
        <g fill="#fff1d6" opacity={0.45}>
          <circle cx={142.6} cy={27} r={2.6} /><circle cx={121} cy={29} r={1.8} /><circle cx={145.6} cy={40} r={1.6} />
        </g>
        <g transform="translate(133 .72) scale(.28)">
          <Athlete shape={back(-11, -1)} saber="#4fb3ff" />
          <Athlete shape={back(11, 1)} saber="#ff4a3d" />
        </g>
        {/* Title over the picture, then the white wave with text, logo, QR and contacts. */}
        <g fill={PAPER}>
          <rect x={120} y={35.6} width={11} height={1.5} rx={0.4} transform="skewX(-12)" transformOrigin="125 36.3" />
          <rect x={124} y={38.2} width={15} height={1.5} rx={0.4} transform="skewX(-12)" transformOrigin="131 39" />
          <path d="M118 42.5 C126 39.5 136 43.5 148 38.5 V63 H118 Z" />
        </g>
        <rect x={122} y={44.6} width={22} height={0.9} rx={0.4} fill="#4a4a4a" />
        <rect x={127} y={44.6} width={4} height={0.9} fill={ORANGE} />
        <rect x={121} y={46.4} width={24} height={0.9} rx={0.4} fill={ORANGE} />
        <rect x={122} y={48.2} width={22} height={0.9} rx={0.4} fill="#4a4a4a" />
        <path d="M122.4 50 L123.3 56 L124.2 56 Z M121.1 56.2 q2.2 -1.6 4.4 0" fill="none" stroke={ORANGE} strokeWidth={0.75} strokeLinejoin="round" />
        <rect x={125.4} y={51} width={8.6} height={1.5} rx={0.3} fill="#2a2a2a" transform="skewX(-10)" transformOrigin="129 51.7" />
        <rect x={128.6} y={53} width={5.4} height={1.3} rx={0.3} fill={ORANGE} transform="skewX(-10)" transformOrigin="131 53.6" />
        <rect x={136.6} y={50.6} width={3.8} height={3.8} fill="#111" />
        <g fill="#555">
          <rect x={141.4} y={51} width={5} height={0.7} /><rect x={141.4} y={52.3} width={5} height={0.7} /><rect x={141.4} y={53.6} width={4.2} height={0.7} />
        </g>
        {/* The sea at sunset. */}
        <path d="M118 59.5 C128 56 138 56.5 148 62 V84 H118 Z" fill="url(#events-rollup-sun)" />
        <circle cx={122.6} cy={65} r={3} fill="#fff1d6" opacity={0.55} />
        <path d="M118 72 Q133 70 148 73" fill="none" stroke="#c9d6dc" strokeWidth={0.5} opacity={0.7} />
        <path d="M139.4 84 L141.6 77.6 L145.4 76 L148 78 V84 Z" fill="#5c4a3e" />
        <g transform="translate(131 36.9) scale(-.31 .31)">
          <Athlete shape={HANGING_GUARD} saber="#ffbf2e" />
        </g>
        <path d="M119.6 83.6 C125 77 136 73.4 147 75.6" fill="none" stroke={PAPER} strokeWidth={0.7} opacity={0.5} />
        <rect x={134.6} y={80.2} width={10.4} height={1.3} rx={0.3} fill={PAPER} transform="skewX(-12)" transformOrigin="140 80.8" />
        <rect x={135.4} y={82.3} width={9.6} height={0.7} rx={0.3} fill={PAPER} opacity={0.9} />
      </g>
    </g>
  );
}
