/*
 * «Il progetto sul banco» (concept G2, 06/10/2026): on a blueprint four gadgets
 * are drawn one after another, then become real, each with the emblem of the
 * Ordine. No names, no prices. Final frame in the base rules (moments.css).
 */
type Box = readonly [x: number, y: number, width: number, height: number];

const GADGETS: readonly { x: number; outline: readonly string[]; real: readonly [className: string, d: string][]; emblem: Box }[] = [
  {
    x: 90,
    outline: ["M-8 -30 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0", "M0 -22 v8", "M-23 10 a23 23 0 1 0 46 0 a23 23 0 1 0 -46 0"],
    real: [
      ["gadget-ring", "M-8 -30 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M0 -22 v8"],
      ["gadget-dark", "M-23 10 a23 23 0 1 0 46 0 a23 23 0 1 0 -46 0"],
    ],
    emblem: [-10, -3, 20, 26],
  },
  {
    x: 160,
    outline: ["M-22 -24 h36 v42 q0 9 -9 9 h-18 q-9 0 -9 -9z", "M14 -12 q17 0 17 12 t-17 12"],
    real: [
      ["gadget-ring", "M14 -12 q17 0 17 12 t-17 12"],
      ["gadget-dark", "M-22 -24 h36 v42 q0 9 -9 9 h-18 q-9 0 -9 -9z"],
    ],
    emblem: [-14, -15, 20, 26],
  },
  {
    x: 234,
    outline: ["M-12 -30 q12 9 24 0 l21 11 l-9 16 l-8 -4 v41 h-32 v-41 l-8 4 l-9 -16z"],
    real: [["gadget-light", "M-12 -30 q12 9 24 0 l21 11 l-9 16 l-8 -4 v41 h-32 v-41 l-8 4 l-9 -16z"]],
    emblem: [-8, -18, 16, 21],
  },
  {
    x: 302,
    outline: ["M-26 10 q0 -36 26 -36 q26 0 26 36z", "M-26 10 h48 q12 0 14 7 h-62z"],
    real: [
      ["gadget-teal", "M-26 10 h48 q12 0 14 7 h-62z"],
      ["gadget-teal", "M-26 10 q0 -36 26 -36 q26 0 26 36z"],
    ],
    emblem: [-8, -20, 16, 21],
  },
];

export function GadgetArt() {
  return (
    <svg className="moment-art moment-gadget" viewBox="0 0 400 200" aria-hidden="true">
      <defs>
        <pattern id="gadget-blueprint-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path className="gadget-grid" d="M16 0 H0 V16" />
        </pattern>
      </defs>
      <g className="gadget-sheet">
        <rect className="gadget-sheet-paper" x="48" y="12" width="304" height="176" rx="3" />
        <rect x="48" y="12" width="304" height="176" fill="url(#gadget-blueprint-grid)" />
      </g>
      <path className="gadget-dims" d="M69 146 h46 M69 142 v8 M115 142 v8 M286 146 h52 M286 142 v8 M338 142 v8 M146 44 h32 M146 40 v8 M178 40 v8" />
      {GADGETS.map((gadget, index) => (
        <g key={gadget.x} transform={`translate(${gadget.x} 92)`}>
          <g className="gadget-outline" style={{ animationDelay: `${0.3 + index * 0.35}s` }}>
            {gadget.outline.map((d) => <path key={d} d={d} pathLength={100} />)}
          </g>
          <g className="gadget-real" style={{ animationDelay: `${1.9 + index * 0.18}s` }}>
            {gadget.real.map(([className, d]) => <path key={d} className={className} d={d} />)}
            <image href="/assets/ordine-emblem.webp" x={gadget.emblem[0]} y={gadget.emblem[1]} width={gadget.emblem[2]} height={gadget.emblem[3]} />
          </g>
        </g>
      ))}
    </svg>
  );
}
