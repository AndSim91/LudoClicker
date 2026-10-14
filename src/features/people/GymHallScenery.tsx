import { GYM_SABER_COLORS } from "../../content/gymStages";
import { GymLayer } from "./GymLayers";
import { HALL_LEVEL, type GymLayout } from "./gymHall";

/**
 * The hall's scenery (concepts of 14/10, «Luci da evento» and the four levels after
 * the Palazzetto): static SVG for the two backdrops, compositor layers for what moves
 * (the lights, the haze, the Lanterna, the fireworks). The fans never move.
 * Scene units of GymScene's hall frame (-420 -40 1480 230).
 */

const EMBLEM = "/assets/ordine-emblem.webp";
const ONDE = "/assets/orders/onde.webp";
const TEAL = "#6cd3d6";
const GOLD = "#f0b85a";
// Every blade colour of the game, in turn, for the fans' raised sabers.
const CHEER = Object.values(GYM_SABER_COLORS);
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** The far stand: two rows (Palasport) or the stadium's three, behind the Arena. */
function farStand(level: number) {
  return level >= HALL_LEVEL.stadium
    ? { from: -440, to: 1080, rows: [36, 20, 4], h: 16, r: 3.5, step: 10, rail: 52 }
    : { from: -190, to: 830, rows: [32, 8], h: 24, r: 4.5, step: 13, rail: 56 };
}

/** The school's standard, as in the hall (290–350, 0–86), scaled on the top centre. */
function SchoolBanner({ top = 0, scale = 1 }: { top?: number; scale?: number }) {
  return (
    <g className="gym-banner" transform={scale === 1 ? undefined : `translate(320 ${top}) scale(${scale}) translate(-320 0)`}>
      <path d="M290 0 H350 V70 L320 86 L290 70 Z" />
      <image href={EMBLEM} x="301" y="8" width="38" height="50" />
    </g>
  );
}

/** The Order's standard: black, the white logo; small on the far wall. */
function OrderBanner({ x, top = -4, small = false }: { x: number; top?: number; small?: boolean }) {
  const [w, h, logo] = small ? [13, 30, 15] : [20, 54, 24];
  return (
    <g className="gym-order-banner">
      <path d={`M${x - w} ${top} H${x + w} V${top + h} L${x} ${top + h + h / 5.4} L${x - w} ${top + h} Z`} strokeWidth={small ? 0.8 : 1.2} />
      <image href={ONDE} x={x - logo / 2} y={top + h * 0.18} width={logo} height={logo * 1.3} />
    </g>
  );
}

/** A fan's lit saber raised to cheer, still like the fan. */
function Cheer({ x, y, k, small = false }: { x: number; y: number; k: number; small?: boolean }) {
  const d = `M${x + 3} ${y + 1} l${small ? 3 : 4} ${small ? -8 : -11}`;
  const color = CHEER[k % CHEER.length];
  return (
    <g strokeLinecap="round">
      <path d={d} stroke={color} strokeWidth={3.4} opacity={0.3} />
      <path d={d} stroke={color} strokeWidth={1.3} />
    </g>
  );
}

/**
 * The LED band along the whole hall, behind the mat: the Order's name every third
 * panel, sponsor slots in between (the pixel-art sponsors come later, with their own code).
 */
function LedBand() {
  const from = -440;
  const slot = 95;
  return (
    <g className="gym-led">
      <rect x={from} y={128} width={1520} height={15} className="gym-led-band" />
      {range(16).map((k) => {
        const x = from + k * slot;
        return k % 3 === 1 ? (
          <text key={k} x={x + slot / 2} y={138.9} textAnchor="middle" textLength={slot - 14} lengthAdjust="spacing" className="gym-led-name">
            ORDINE DELLE ONDE
          </text>
        ) : (
          <g key={k} className="gym-led-slot">
            <rect x={x + 6} y={130.4} width={slot - 12} height={10.2} rx={1.2} />
            <text x={x + slot / 2} y={137.8} textAnchor="middle">SPONSOR</text>
          </g>
        );
      })}
      <rect x={from} y={128} width={1520} height={1.2} fill={TEAL} opacity={0.7} />
    </g>
  );
}

/** A TV camera on its tripod, the lens towards `f`. */
function Camera({ x, f }: { x: number; f: 1 | -1 }) {
  return (
    <g className="gym-camera">
      <path d={`M${x} 118 L${x - 10} 150 M${x} 118 L${x + 10} 150 M${x} 118 V150`} />
      <rect x={x - 12} y={105} width={24} height={13} rx={2} />
      <rect x={f > 0 ? x + 12 : x - 19} y={108} width={7} height={7} rx={1} />
      <circle cx={x - 7.5 * f} cy={108.5} r={1.3} fill="#ff4d4d" stroke="none" />
    </g>
  );
}

/** Behind the lights: wall or night sky, truss or towers, the stands and their fans. */
export function HallBackdrop({ level }: { level: number }) {
  const stadium = level >= HALL_LEVEL.stadium;
  const far = farStand(level);
  const tiers = range(stadium ? 8 : level >= HALL_LEVEL.championship ? 5 : 4);
  const cheering = level >= HALL_LEVEL.championship;
  const wall = stadium ? ["#01060f", "#041a2e", "#06304b"] : ["#010d17", "#021e31", "#052c45"];
  const sideHeads = (i: number) => {
    const row = (from: number, to: number) => range(Math.floor((to - from) / 14) + 1).map((k) => ({ x: from + k * 14, k }));
    return [...row(-432, -200 - i * 22), ...row(840 + i * 22, 1072)];
  };
  const farHeads = (y: number) => range(Math.floor((far.to - far.from) / far.step)).map((k) => ({ x: far.from + 6 + k * far.step + (y % 2) * 4, k }));

  return (
    <>
      <defs>
        <linearGradient id={`gym-hall-wall-${stadium ? "sky" : "hall"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={wall[0]} />
          <stop offset={stadium ? 0.55 : 0.3} stopColor={wall[1]} />
          <stop offset="1" stopColor={wall[2]} />
        </linearGradient>
        <linearGradient id="gym-horizon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={TEAL} stopOpacity="0" />
          <stop offset="1" stopColor={TEAL} stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <rect x="-1000" y="-40" width="2640" height="220" fill={`url(#gym-hall-wall-${stadium ? "sky" : "hall"})`} />

      {stadium ? (
        <g>
          {range(70).map((k) => (
            <circle key={k} cx={-420 + ((k * 97) % 1480)} cy={-39 + ((k * 53) % 40)} r={0.6 + (k % 3) * 0.25} fill="#cfe6ff" opacity={0.3 + (k % 4) * 0.15} />
          ))}
          {/* The city's glow on the horizon and, far beyond the stands, the Lanterna. */}
          <rect x={-440} y={-20} width={1520} height={22} fill="url(#gym-horizon)" />
          <g transform="translate(0 13) translate(-200 4) scale(1.35) translate(200 -4)">
            <g fill="#0e3a57">
              <rect x={-206} y={-12} width={12} height={18} />
              <rect x={-208} y={-14} width={16} height={2} />
              <rect x={-204} y={-26} width={8} height={12} />
              <rect x={-206} y={-27.5} width={12} height={1.5} />
              <path d="M-203 -33 L-200 -37 L-197 -33 Z" />
            </g>
            <rect x={-202} y={-33} width={4} height={5.5} fill="#ffd166" />
          </g>
        </g>
      ) : (
        <path
          className="gym-truss"
          d={`M-460 -4 H1100 M-460 -36 H1100${range(39).map((i) => ` M${-460 + i * 40} -4 L${-440 + i * 40} -36 L${-420 + i * 40} -4`).join("")}`}
        />
      )}

      {level >= HALL_LEVEL.palasport ? (
        <g>
          <g className="gym-tiers">
            {far.rows.map((y) => <rect key={y} x={far.from} y={y} width={far.to - far.from} height={far.h} />)}
          </g>
          <g className="gym-crowd">
            {far.rows.map((y) => farHeads(y).map(({ x, k }) => <circle key={`${y}-${k}`} cx={x} cy={y - 3} r={far.r} />))}
          </g>
          {far.rows.map((y) => farHeads(y).filter(({ k }) => (k * 5 + y) % 6 === 0).map(({ x, k }) => (
            <Cheer key={`${y}-${k}`} x={x} y={y - 3} k={k} small />
          )))}
          {/* Every standard hangs from the far stand's rail, under the fans, on the far wall. */}
          <path d={`M${far.from} ${far.rail} H${far.to}`} stroke="#0e4563" strokeWidth={1.5} />
          <OrderBanner x={61} top={far.rail} small />
          <OrderBanner x={581} top={far.rail} small />
          <SchoolBanner top={far.rail} scale={0.48} />
        </g>
      ) : null}

      <rect x="-1000" y="150" width="2640" height="80" className="gym-floor" />
      <path d="M-1000 162 H1640 M-1000 172 H1640 M-80 150 L-140 180 M80 150 L40 180 M200 150 L180 180 M320 150 V180 M440 150 L460 180 M560 150 L600 180 M720 150 L780 180" className="gym-floor-lines" />

      <g className="gym-tiers">
        {tiers.map((i) => (
          <g key={i}>
            <rect x={-440} y={126 - i * 24} width={250 - i * 22} height={24} />
            <rect x={830 + i * 22} y={126 - i * 24} width={250 - i * 22} height={24} />
          </g>
        ))}
      </g>
      <g className="gym-crowd">
        {tiers.map((i) => sideHeads(i).map(({ x }) => <circle key={`${i}-${x}`} cx={x} cy={122 - i * 24} r={5} />))}
      </g>
      {cheering
        ? tiers.map((i) => sideHeads(i).filter(({ k }) => (k * 7 + i * 3) % 4 === 0).map(({ x, k }) => (
            <Cheer key={`${i}-${x}`} x={x} y={122 - i * 24} k={k + i} />
          )))
        : null}

      {stadium ? (
        <g>
          <path d="M-395 -24 Q320 14 1035 -24" fill="none" stroke="#0b4565" strokeWidth={1.2} />
          {[-395, 1035].map((x) => (
            <g key={x}>
              <rect x={x - 3} y={-24} width={6} height={174} fill="#031a2b" />
              <rect x={x - 17} y={-38} width={34} height={14} rx={1.5} fill="#0a2236" />
            </g>
          ))}
        </g>
      ) : null}
    </>
  );
}

function Firework({ x, y, color, className }: { x: number; y: number; color: string; className: string }) {
  return (
    <GymLayer box={{ x: x - 16, y: y - 16, w: 32, h: 32 }} className={`gym-firework ${className}`}>
      {range(12).map((k) => {
        const a = (k / 12) * Math.PI * 2;
        return <line key={k} x1={x + Math.cos(a) * 4} y1={y + Math.sin(a) * 4} x2={x + Math.cos(a) * 13} y2={y + Math.sin(a) * 13} stroke={color} strokeWidth={1.2} strokeLinecap="round" />;
      })}
      <circle cx={x} cy={y} r={1.6} fill="#fff" />
    </GymLayer>
  );
}

/** The lamps sweeping the Arena (two, four from the Palasport) and, in the stadium, the Lanterna's beam and the fireworks. */
export function HallLights({ layout }: { layout: GymLayout }) {
  return (
    <>
      {layout.sweeps.map(([lamp, aim], index) => {
        const box = { x: Math.min(lamp - 6, aim - 70), y: -36, w: Math.max(lamp + 6, aim + 70) - Math.min(lamp - 6, aim - 70), h: 190 };
        return (
          <GymLayer
            key={`${lamp}-${aim}`}
            box={box}
            className="gym-sweep"
            style={{ transformOrigin: `${((lamp - box.x) / box.w) * 100}% 3%`, animationDelay: `${-index * 4.5}s` }}
          >
            <defs>
              <linearGradient id="gym-sweep-beam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fbf1dc" stopOpacity="0.3" />
                <stop offset="1" stopColor="#fbf1dc" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect className="gym-lamp" x={lamp - 9} y={-36} width={18} height={10} rx={2} />
            <polygon points={`${lamp - 4},-28 ${lamp + 4},-28 ${aim + 44},152 ${aim - 44},152`} fill="url(#gym-sweep-beam)" />
          </GymLayer>
        );
      })}
      {layout.hallLevel >= HALL_LEVEL.stadium ? (
        <>
          <GymLayer box={{ x: -380, y: -42, w: 360, h: 22 }} className="gym-lantern-beam">
            <polygon points="-200,-30 -24,-38 -24,-22" fill="#ffd166" opacity="0.35" />
          </GymLayer>
          <Firework x={110} y={-22} color={GOLD} className="is-a" />
          <Firework x={560} y={-26} color={TEAL} className="is-b" />
          <Firework x={-20} y={-28} color="#ff8fb1" className="is-c" />
        </>
      ) : null}
    </>
  );
}

/** In front of the lights: the row behind the mat, the LED band, the mat and the Arena, standards and (stadium) cameras. */
export function HallFront({ layout }: { layout: GymLayout }) {
  const level = layout.hallLevel;
  const { mat, front } = layout;
  return (
    <>
      <defs>
        <radialGradient id="gym-pool">
          <stop offset="0" stopColor="#fbf1dc" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fbf1dc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="gym-crowd gym-crowd-front">
        {range(front.heads).map((index) => <circle key={index} cx={front.x + 12 + index * 24} cy={index % 2 ? 128 : 132} r={6} />)}
        {level >= HALL_LEVEL.onde ? null : <rect x={front.x} y="134" width={front.heads * 24} height="8" rx="2" />}
      </g>
      {level >= HALL_LEVEL.onde ? <LedBand /> : null}

      <rect x={mat.x} y="144" width={mat.w} height="10" rx="3" className="gym-mat" />
      <ellipse cx="321" cy="151" rx="66" ry="7" className="gym-arena" />
      {level >= HALL_LEVEL.championship
        ? range(28).map((k) => {
            const a = (k / 28) * Math.PI * 2;
            return <circle key={k} cx={321 + Math.cos(a) * 72} cy={151 + Math.sin(a) * 9} r={1.1} fill="#fbf1dc" opacity={0.85} />;
          })
        : null}
      <ellipse cx="321" cy="149" rx="170" ry="16" fill="url(#gym-pool)" />

      {level === HALL_LEVEL.championship || level === HALL_LEVEL.palasport
        ? range(93).map((k) => (
            <path key={k} d={`M${-420 + k * 16} -4 L${-408 + k * 16} -4 L${-414 + k * 16} 6 Z`} fill={[TEAL, GOLD, "#e8f1f7"][k % 3]} opacity={0.75} />
          ))
        : null}

      {level >= HALL_LEVEL.palasport ? null : <SchoolBanner />}
      {level === HALL_LEVEL.onde || level === HALL_LEVEL.championship ? (
        <>
          <OrderBanner x={-150} />
          <OrderBanner x={790} />
        </>
      ) : null}
      {level >= HALL_LEVEL.stadium ? (
        <>
          <Camera x={-250} f={1} />
          <Camera x={890} f={-1} />
        </>
      ) : null}
    </>
  );
}

/** A still blue haze over the mat, under the athletes (14/10: it does not move). */
export function HallHaze() {
  return (
    <GymLayer box={{ x: 20, y: 100, w: 600, h: 56 }} className="gym-haze">
      <defs>
        <radialGradient id="gym-haze-fill">
          <stop offset="0" stopColor={TEAL} stopOpacity="0.34" />
          <stop offset="1" stopColor={TEAL} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={320} cy={138} rx={300} ry={26} fill="url(#gym-haze-fill)" />
    </GymLayer>
  );
}
