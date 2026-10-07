/* Modalità Onde, schermata iniziale: il mare disegnato al posto di onde-wave.webp
   (concept B «Marea», schiuma S4 «Scie», 07/10/2026). Ogni fila di onde è un <svg>
   a sé, largo un periodo in più dello schermo, che scorre di un periodo esatto:
   l'animazione è un transform su un box HTML, quindi la fa il compositor. */

import type { CSSProperties } from "react";

const W = 1600;
const H = 1000;

type Band = { y: number; amp: number; period: number; fill: string; duration: number; foam: number; phase: number };

const BANDS: Band[] = [
  { y: 700, amp: 22, period: 1300, fill: "#0d4966", duration: 160, foam: 9, phase: 0.3 },
  { y: 780, amp: 30, period: 1500, fill: "#125d76", duration: 130, foam: 12, phase: 2.1 },
  { y: 860, amp: 36, period: 1700, fill: "#167385", duration: 100, foam: 15, phase: 4.0 },
  { y: 945, amp: 28, period: 1400, fill: "#0a3a55", duration: 75, foam: 13, phase: 1.2 },
];

type Point = [number, number];

const toPath = (points: Point[]) => "M" + points.map(([x, y]) => `${x},${y.toFixed(1)}`).join("L");

/* Somma di armoniche del periodo: creste diverse tra loro, ma dopo un periodo
   il profilo torna identico, così lo scorrimento non ha salti. */
function profile({ y, amp, period, phase }: Band): Point[] {
  const points: Point[] = [];
  for (let x = 0; x <= W + period; x += 8) {
    const t = (x / period) * Math.PI * 2;
    const h = Math.sin(2 * t + phase) + 0.45 * Math.sin(3 * t + 1.1 + phase) + 0.22 * Math.sin(5 * t + 0.4);
    points.push([x, y - amp * h]);
  }
  return points;
}

/* Cresta piena: sottile ai lati, più spessa al picco, bordo basso appena mosso. */
function crestCap(segment: Point[], thickness: number) {
  const last = segment.length - 1;
  const top: Point[] = [];
  const bottom: Point[] = [];
  segment.forEach(([x, y], i) => {
    const u = (i / last) * 2 - 1;
    const t = thickness * Math.max(0, 1 - u * u) ** 0.7;
    top.push([x, y - t * 0.35]);
    bottom.push([x, y + t * (0.7 + 0.3 * Math.abs(Math.sin(x * 0.11)))]);
  });
  return toPath(top) + "L" + bottom.reverse().map(([x, y]) => `${x},${y.toFixed(1)}`).join("L") + "Z";
}

type Trail = { d: string; width: number; dash: string; opacity: number };
type BandShape = Band & { body: string; groove: string; caps: string[]; trails: Trail[] };

function buildBand(band: Band, index: number): BandShape {
  const points = profile(band);
  const caps: string[] = [];
  const trails: Trail[] = [];
  const w = band.foam;
  for (let j = 2; j < points.length - 2; j++) {
    const [x, y] = points[j];
    const isCrest = y <= points[j - 1][1] && y < points[j + 1][1] && y < band.y - band.amp * 0.55;
    if (!isCrest) continue;
    const segment = points.filter(([sx]) => sx > x - band.amp * 5 && sx < x + band.amp * 2.4);
    if (segment.length < 4) continue;
    caps.push(crestCap(segment, w * 0.7));
    /* Tre scie che scendono sul fronte dell'onda, più corte e più tenui man mano. */
    for (let k = 1; k <= 3; k++) {
      const part = segment.slice(Math.floor(segment.length * (0.15 + k * 0.08)), Math.floor(segment.length * (0.95 - k * 0.05)));
      if (part.length < 3) continue;
      const seed = (index * 7 + j + k * 3) % 5;
      trails.push({
        d: toPath(part.map(([px, py]) => [px, py + w * 1.1 * k])),
        width: w * (0.32 - k * 0.06),
        dash: `${w * (1 + seed * 0.4)} ${w * (0.8 + (seed % 3) * 0.4)} ${w * 0.3} ${w * (1 + (seed % 2))}`,
        opacity: 0.65 - k * 0.15,
      });
    }
  }
  return {
    ...band,
    body: `${toPath(points)}L${W + band.period},${H}L0,${H}Z`,
    groove: toPath(points.map(([x, y]) => [x, y + band.amp * 0.8])),
    caps,
    trails,
  };
}

// ponytail: calcolato una volta al caricamento del modulo, il disegno non cambia mai.
const SHAPES = BANDS.map(buildBand);

export function OndeSea() {
  return (
    <div className="onde-sea" aria-hidden="true">
      <svg className="onde-sea-sky" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="onde-sea-teal" x1="0" x2="1">
            <stop offset="0" stopColor="#2a919d" stopOpacity=".25" />
            <stop offset=".35" stopColor="#2a919d" stopOpacity=".9" />
          </linearGradient>
          <linearGradient id="onde-sea-gold" x1="0" x2="1">
            <stop offset="0" stopColor="#e0a64a" stopOpacity=".3" />
            <stop offset=".35" stopColor="#e8ae52" />
          </linearGradient>
        </defs>
        <rect x="-200" y="-90" width="980" height="120" rx="60" transform="rotate(-50) translate(-120 330)" fill="#fff" opacity=".035" />
        <g transform="rotate(-40 1450 330)">
          <rect x="1250" y="250" width="560" height="54" rx="27" fill="url(#onde-sea-teal)" />
          <rect x="1230" y="340" width="600" height="54" rx="27" fill="url(#onde-sea-gold)" />
        </g>
      </svg>
      {SHAPES.map((band, index) => (
        <svg
          key={band.y}
          className={`onde-sea-band${index % 2 ? " is-reverse" : ""}`}
          viewBox={`0 0 ${W + band.period} ${H}`}
          style={
            {
              width: `${((W + band.period) / W) * 100}%`,
              animationDuration: `${band.duration}s`,
              "--onde-sea-shift": `${(-band.period / (W + band.period)) * 100}%`,
            } as CSSProperties
          }
        >
          <path d={band.body} fill={band.fill} />
          <path d={band.groove} fill="none" stroke="#5cc8cc" strokeOpacity=".2" strokeWidth="5" />
          <g fill="#fbf1dc">
            {band.caps.map((d) => <path key={d} d={d} />)}
          </g>
          <g fill="none" stroke="#fbf1dc" strokeLinecap="round">
            {band.trails.map((trail) => (
              <path key={trail.d} d={trail.d} strokeWidth={trail.width} strokeDasharray={trail.dash} opacity={trail.opacity} />
            ))}
          </g>
        </svg>
      ))}
    </div>
  );
}
