import type { CSSProperties } from "react";
import { CONSTELLATION_SIZE, CONSTELLATION_SLOTS, CROWN, CENTER_X, EDGES, type FoundationStar } from "./constellation";

/* Nuova sede: the constellation of the Rete (geometry in constellation.ts). */
const point = (index: number) => CONSTELLATION_SLOTS[index];

/** Background stars, the same for a given school number. */
function getDust(seed: number) {
  let value = seed % 2147483647 || 1;
  const next = () => ((value = (value * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 90 }, () => ({
    x: next() * 1000,
    y: next() * 620,
    r: 0.6 + next() * 1.3,
    opacity: 0.12 + next() * 0.3,
    duration: 2 + next() * 3,
    delay: next() * 2,
  }));
}

function delayStyle(seconds: number): CSSProperties {
  return { animationDelay: `${seconds.toFixed(2)}s` };
}

export function FoundationArt({
  number,
  stars,
  dropped,
  previousCity,
  newcomerName,
  newcomerCity,
}: {
  number: number;
  stars: readonly FoundationStar[];
  dropped: number;
  previousCity: string;
  newcomerName: string;
  newcomerCity: string;
}) {
  const lit = Math.min(stars.length, CONSTELLATION_SIZE);
  const full = lit >= CONSTELLATION_SIZE;
  const completes = number === CONSTELLATION_SIZE;
  const [nx, ny] = full ? CROWN : [point(lit)[1], point(lit)[2]];
  const lightAt = (index: number) => 0.25 + (index / Math.max(1, lit)) * 1.3;
  const newLeft = !full && nx < CENTER_X;
  const previous = lit > 1 ? point(lit - 1) : null;
  const previousLeft = previous ? (previous[1] === CENTER_X ? !newLeft : previous[1] < CENTER_X) : false;
  const edgeX = (left: boolean) => (left ? -6 : 190);

  return (
    <>
      <svg className="moment-dust" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {getDust(number * 31 + 7).map((dot, index) => (
          <circle
            key={index}
            cx={dot.x.toFixed(0)}
            cy={dot.y.toFixed(0)}
            r={dot.r.toFixed(1)}
            opacity={dot.opacity.toFixed(2)}
            style={{ animationDuration: `${dot.duration.toFixed(1)}s`, animationDelay: `${dot.delay.toFixed(1)}s` }}
          />
        ))}
      </svg>
      <svg className="moment-art moment-constellation" viewBox="-10 -27 204 284" aria-hidden="true">
        <defs>
          <filter id="moment-constellation-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        {completes || full ? (
          <g className="moment-constellation-glow" style={delayStyle(completes ? 2.7 : 1.5)} filter="url(#moment-constellation-blur)">
            {EDGES.map(([a, b], index) => (
              <line key={index} x1={point(a)[1]} y1={point(a)[2]} x2={point(b)[1]} y2={point(b)[2]} />
            ))}
          </g>
        ) : null}
        <g className="moment-constellation-ghost">
          {EDGES.filter(([a, b]) => a >= lit || b >= lit).map(([a, b], index) => (
            <line key={index} x1={point(a)[1]} y1={point(a)[2]} x2={point(b)[1]} y2={point(b)[2]} />
          ))}
          {CONSTELLATION_SLOTS.map(([key, x, y], index) => (index > lit ? <circle key={key} cx={x} cy={y} r="1" /> : null))}
        </g>
        {EDGES.map(([a, b], index) => {
          const reachesNew = !full && Math.max(a, b) === lit && Math.min(a, b) < lit;
          if (!reachesNew && (a >= lit || b >= lit)) return null;
          return (
            <line
              key={index}
              className={reachesNew ? "moment-constellation-line is-new" : "moment-constellation-line"}
              pathLength={1}
              x1={point(a)[1]}
              y1={point(a)[2]}
              x2={point(b)[1]}
              y2={point(b)[2]}
              style={delayStyle(reachesNew ? 1.85 : lightAt(Math.max(a, b)))}
            />
          );
        })}
        {full ? (
          <line className="moment-constellation-line is-new" pathLength={1} x1={CENTER_X} y1={4} x2={CROWN[0]} y2={CROWN[1] + 6} style={delayStyle(1.85)} />
        ) : null}
        {stars.slice(0, lit).map((star, index) => {
          const [key, x, y] = point(index);
          const radius = star.light === null ? 1.4 : 1.7 + 2 * star.light;
          const tone = index === 0 ? "is-madre" : star.light === null ? "is-unknown" : "";
          return (
            <g key={key}>
              <circle className="moment-star-aura" cx={x} cy={y} r={radius * 3} opacity={0.05 + (star.light ?? 0) * 0.12} style={delayStyle(lightAt(index))} />
              <circle className={`moment-star ${tone}`} cx={x} cy={y} r={radius} style={delayStyle(lightAt(index))} />
            </g>
          );
        })}
        <text className="moment-star-label is-madre" x={point(0)[1] + 9} y={point(0)[2] + 3}>Sede madre</text>
        {previous ? (
          <g className="moment-star-note" style={delayStyle(lightAt(lit - 1))}>
            <line x1={previous[1]} y1={previous[2]} x2={edgeX(previousLeft)} y2={previous[2]} />
            <text x={edgeX(previousLeft) + (previousLeft ? -3 : 3)} y={previous[2] + 3} textAnchor={previousLeft ? "end" : "start"}>
              {previousCity}
            </text>
          </g>
        ) : null}
        <circle className="moment-star-halo" cx={nx} cy={ny} r="6" />
        <g className="moment-star-new">
          <path d={`M${nx} ${ny - 9} L${nx + 2} ${ny - 2} L${nx + 9} ${ny} L${nx + 2} ${ny + 2} L${nx} ${ny + 9} L${nx - 2} ${ny + 2} L${nx - 9} ${ny} L${nx - 2} ${ny - 2} Z`} />
          <circle cx={nx} cy={ny} r="2.4" />
        </g>
        <g className="moment-star-note is-new">
          {full ? null : <line x1={nx} y1={ny} x2={edgeX(newLeft)} y2={ny} />}
          {(() => {
            const x = full ? nx + 14 : edgeX(newLeft) + (newLeft ? -3 : 3);
            const anchor = full || !newLeft ? "start" : "end";
            return (
              <>
                <text className="moment-star-name" x={x} y={ny - 2} textAnchor={anchor}>{newcomerName}</text>
                <text x={x} y={ny + 10} textAnchor={anchor}>{`N° ${number} · ${newcomerCity}`}</text>
              </>
            );
          })()}
        </g>
        {dropped > 0 ? (
          <text className="moment-star-label" x={CENTER_X} y={253} textAnchor="middle">
            {`+${dropped} sedi, contate ma fuori dal simbolo`}
          </text>
        ) : null}
      </svg>
    </>
  );
}
