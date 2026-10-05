/*
 * «La porta delle Chronicles si apre» (concept A, 05/10/2026): the Key comes
 * down and turns in the lock, the doors of the hall of the Leggendari open on
 * the light and on six nameless figures, one for each athlete of the team.
 * Final frame in the base rules; moments.css animates from the closed door.
 */
const DUST = Array.from({ length: 30 }, (_, index) => ({
  x: (index * 97 + 31) % 400,
  y: (index * 53 + 17) % 160,
  r: (index % 3) * 0.4 + 0.5,
  delay: (index % 7) * 0.4,
}));
const FIGURES = [158, 175, 192, 208, 225, 242];

export function ChroniclesArt() {
  return (
    <svg className="moment-art moment-chronicles" viewBox="0 0 400 240" aria-hidden="true">
      <defs>
        <radialGradient id="chronicles-door-light" cx="50%" cy="62%" r="62%">
          <stop offset="0" stopColor="#fff3d1" />
          <stop offset="0.5" stopColor="#f0b85a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#f0b85a" stopOpacity="0" />
        </radialGradient>
        <path id="chronicles-arch-text" d="M106 104 A94 94 0 0 1 294 104" />
      </defs>
      <g className="chronicles-dust">
        {DUST.map((star) => (
          <circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={star.r} style={{ animationDelay: `${star.delay}s` }} />
        ))}
      </g>
      <ellipse className="chronicles-halo" cx="200" cy="150" rx="150" ry="90" />
      <text className="chronicles-lintel">
        <textPath href="#chronicles-arch-text" startOffset="50%" textAnchor="middle">CHRONICLES OF LUDOSPORT</textPath>
      </text>
      <path className="chronicles-arch" d="M128 214 V102 A72 72 0 0 1 272 102 V214 Z" />
      <path className="chronicles-light" d="M140 214 V102 A60 60 0 0 1 260 102 V214 Z" />
      {FIGURES.map((x, index) => (
        <g key={x} className="chronicles-figure" style={{ animationDelay: `${3 + index * 0.12}s` }}>
          <circle cx={x} cy="166" r="5.5" />
          <path d={`M${x - 9} 196 Q${x} 168 ${x + 9} 196 Z`} />
          <text x={x} y="186">?</text>
        </g>
      ))}
      <g className="chronicles-leaf is-left">
        <path d="M140 214 V102 A60 60 0 0 1 200 42 V214 Z" />
        <path className="chronicles-moulding" d="M150 204 V106 A50 50 0 0 1 192 54 V204 Z" />
      </g>
      <g className="chronicles-leaf is-right">
        <path d="M260 214 V102 A60 60 0 0 0 200 42 V214 Z" />
        <path className="chronicles-moulding" d="M250 204 V106 A50 50 0 0 0 208 54 V204 Z" />
      </g>
      <circle className="chronicles-keyhole" cx="200" cy="140" r="8" />
      <g className="chronicles-key">
        <circle cx="200" cy="100" r="11" className="chronicles-key-bow" />
        <circle cx="200" cy="100" r="4" />
        <rect x="197.8" y="111" width="4.4" height="34" />
        <rect x="202" y="134" width="8" height="4" />
        <rect x="202" y="140" width="6" height="4" />
      </g>
      <rect className="chronicles-floor" x="104" y="214" width="192" height="5" rx="1" />
    </svg>
  );
}
