import { useId, useMemo } from "react";
import { seededRoll } from "./finalDuel";

/**
 * The Torneo Reptile at night on the port of Genova (concept R2, 10/10/2026):
 * houses on the hills, cranes, the sea, the Lanterna sweeping the sky and a
 * string of green bulbs over the Arena. Same 640×300 frame as FinalArenaBackdrop.
 */
export function ReptileHarborBackdrop({ title }: { title: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { sky: `rh-sky-${uid}`, beam: `rh-beam-${uid}` };
  const city = useMemo(() => {
    const roll = seededRoll("reptile-harbor");
    const houses: { x: number; y: number; h: number; lit: boolean; delay: number }[] = [];
    for (let index = 0; index < 46; index += 1) {
      const x = index * 14 + roll() * 4;
      const h = 14 + roll() * 26 + (index > 18 && index < 34 ? 10 : 0);
      houses.push({ x, y: 128 - h, h, lit: roll() > 0.45, delay: -roll() * 2.4 });
    }
    const stars = Array.from({ length: 34 }, (_, index) => ({
      x: (index * 97) % 640,
      y: ((index * 37) % 70) + 6,
      r: index % 3 ? 0.7 : 1.2,
    }));
    return { houses, stars };
  }, []);

  return (
    <g className="fd-hall is-reptile">
      <defs>
        <linearGradient id={ids.sky} x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor="#020b1c" />
          <stop offset={0.7} stopColor="#0b2740" />
          <stop offset={1} stopColor="#123a3a" />
        </linearGradient>
        <linearGradient id={ids.beam} x1={0} y1={0} x2={1} y2={0}>
          <stop offset={0} stopColor="#fff2c4" stopOpacity={0.55} />
          <stop offset={1} stopColor="#fff2c4" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect width={640} height={300} fill={`url(#${ids.sky})`} />
      {city.stars.map((star) => (
        <circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={star.r} fill="#fbf1dc" opacity={0.6} />
      ))}
      <path d="M0 110 Q90 70 190 96 T380 84 T640 100 V130 H0 Z" fill="#071c2c" />
      {city.houses.map((house) => (
        <g key={house.x}>
          <rect x={house.x} y={house.y} width={12} height={house.h} fill="#0b2a3f" />
          {house.lit ? (
            <rect className="rh-window" x={house.x + 4} y={house.y + 5} width={3} height={3} fill="#ffd27a" style={{ animationDelay: `${house.delay}s` }} />
          ) : null}
        </g>
      ))}
      <g transform="translate(560 0)">
        <polygon className="rh-lantern-beam" points="0,28 -230,6 -230,58" fill={`url(#${ids.beam})`} />
        <rect x={-9} y={64} width={18} height={66} fill="#d9d3c3" />
        <rect x={-11} y={40} width={22} height={26} fill="#e8e1d0" />
        <rect x={-7} y={26} width={14} height={14} fill="#ffe7a3" />
        <path d="M-9 26 L0 18 L9 26 Z" fill="#c9c1ad" />
      </g>
      {[80, 150].map((x, index) => (
        <g key={x} stroke="#1d4a5c" strokeWidth={3} fill="none">
          <path d={`M${x} 130 V${70 - index * 8} H${x + 70} M${x} ${70 - index * 8} L${x - 20} ${82 - index * 8}`} />
          <line x1={x + 60} y1={70 - index * 8} x2={x + 60} y2={104 - index * 8} strokeWidth={1.5} />
        </g>
      ))}
      <rect y={128} width={640} height={40} fill="#06202e" />
      {[136, 146, 156].map((y, index) => (
        <path
          key={y}
          d={`M0 ${y} Q40 ${y - 3} 80 ${y} T160 ${y} T240 ${y} T320 ${y} T400 ${y} T480 ${y} T560 ${y} T640 ${y}`}
          stroke="#2f7b86"
          strokeWidth={1}
          fill="none"
          opacity={0.5 - index * 0.12}
        />
      ))}
      <path d="M0 162 Q320 140 640 162" stroke="#cdeeb6" strokeWidth={1} fill="none" opacity={0.6} />
      {Array.from({ length: 21 }, (_, index) => {
        const x = index * 32;
        const y = 162 - 22 * (1 - ((x - 320) / 320) ** 2);
        return <circle key={x} className="rh-bulb" cx={x} cy={y + 4} r={2.6} fill="#b8f28f" style={{ animationDelay: `${-index * 0.3}s` }} />;
      })}
      <text className="fd-title is-reptile" x={320} y={26} textAnchor="middle">{title}</text>
      <rect y={168} width={640} height={132} fill="#04150d" />
      <ellipse className="fd-ring" cx={320} cy={236} rx={250} ry={52} fill="#16463a" stroke="#8fd16a" strokeWidth={2.5} opacity={0.95} />
      <ellipse cx={320} cy={236} rx={70} ry={15} fill="none" stroke="#fbf1dc" strokeWidth={1} opacity={0.25} />
    </g>
  );
}
