import type { ReactNode } from "react";

/*
 * «Nasce il Torneo della Superba»: the green Reptile plaque fades in the smoke,
 * the Lanterna di Genova rises from the sea in backlight, its beam sweeps the
 * scene and turns the Superba medal. The tower is traced on the one in the
 * Superba logo, in that picture's coordinates (centre x 196, base y 640),
 * scaled into the 400 × 240 scene.
 */
const SCALE = 0.235;
const x = (value: number) => 82 + (value - 196) * SCALE;
const y = (value: number) => 214 - (640 - value) * SCALE;
const size = (value: number) => value * SCALE;
/** The lamp, where the beam starts (also used by moments.css as transform-origin). */
const SUPERBA_LAMP = { x: x(197), y: y(96) };

function block(x0: number, y0: number, x1: number, y1: number, key: string) {
  return <rect key={key} className="superba-stone" x={x(x0)} y={y(y0)} width={size(x1 - x0)} height={size(y1 - y0)} />;
}

function merlons(x0: number, x1: number, top: number, height: number, width: number, gap: number, key: string) {
  const parts: ReactNode[] = [];
  for (let left = x0; left + width <= x1 + 0.01; left += width + gap) {
    parts.push(block(left, top - height, left + width, top, `${key}-${left}`));
  }
  return parts;
}

function archedWindow(top: number, bottom: number) {
  const radius = size(6);
  const left = x(191);
  const right = x(203);
  const arc = y(top) + radius;
  return (
    <path
      key={top}
      className="superba-window"
      d={`M${left} ${y(bottom)} V${arc} A${radius} ${radius} 0 0 1 ${right} ${arc} V${y(bottom)} Z`}
    />
  );
}

/** Corbels under the crenellated terrace. */
const CORBELS = Array.from({ length: 8 }, (_, index) => 146 + index * 13)
  .map((left) => `M${x(left)} ${y(186)} L${x(left + 6)} ${y(176)} L${x(left + 12)} ${y(186)}`)
  .join(" ");

function cartouche(inset: number, top: number, bottom: number) {
  const left = x(176 + inset);
  const right = x(218 - inset);
  return `M${left} ${y(top)} H${right} V${y(410)} Q${right} ${y(bottom - 8)} ${x(197)} ${y(bottom)} Q${left} ${y(bottom - 8)} ${left} ${y(410)} Z`;
}

function Lanterna() {
  return (
    <>
      {block(62, 594, 140, 650, "fort")}
      {merlons(62, 140, 594, 13, 12, 10, "fort")}
      {block(126, 598, 270, 650, "plinth")}
      {block(134, 588, 262, 600, "plinth-step")}
      {block(150, 360, 244, 590, "lower")}
      {block(138, 346, 256, 363, "cornice")}
      {block(145, 330, 249, 347, "cornice-top")}
      {block(152, 184, 242, 331, "upper")}
      {block(144, 166, 250, 186, "corbel-band")}
      <path className="superba-edge" d={CORBELS} />
      {block(140, 146, 254, 167, "terrace")}
      {merlons(140, 254, 146, 13, 14, 11, "terrace")}
      {block(168, 112, 226, 134, "lantern-base")}
      <rect className="superba-glass" x={x(173)} y={y(80)} width={size(48)} height={size(32)} />
      <circle className="superba-lamp" cx={SUPERBA_LAMP.x} cy={SUPERBA_LAMP.y} r={size(12)} />
      <path className="superba-edge" d={`M${x(189)} ${y(80)} V${y(112)} M${x(205)} ${y(80)} V${y(112)}`} />
      {block(165, 70, 229, 81, "cap")}
      <path className="superba-stone" d={`M${x(178)} ${y(70)} Q${x(197)} ${y(36)} ${x(216)} ${y(70)} Z`} />
      <circle className="superba-stone" cx={x(197)} cy={y(40)} r={size(6)} />
      {[[205, 240], [268, 303], [468, 503], [540, 575]].map(([top, bottom]) => archedWindow(top, bottom))}
      <path className="superba-gold" d={cartouche(0, 388, 440)} />
      <path
        className="superba-gold"
        d={`M${x(182)} ${y(388)} L${x(184)} ${y(372)} L${x(191)} ${y(380)} L${x(197)} ${y(368)} L${x(203)} ${y(380)} L${x(210)} ${y(372)} L${x(212)} ${y(388)} Z`}
      />
      <path className="superba-shield" d={cartouche(8, 394, 431)} />
      <path className="superba-cross" d={`M${x(194)} ${y(396)} h${size(6)} v${size(32)} h${-size(6)} Z M${x(186)} ${y(406)} h${size(22)} v${size(6)} h${-size(22)} Z`} />
    </>
  );
}

const SPARKS = [0, 1, 2, 3, 4];

export function SuperbaArt({ city, fameLabel }: { city: string; fameLabel: string }) {
  const beam = `${SUPERBA_LAMP.x},${SUPERBA_LAMP.y} 420,${SUPERBA_LAMP.y - 66} 420,${SUPERBA_LAMP.y + 64}`;
  return (
    <div className="moment-art moment-superba-art" aria-hidden="true">
      <div className="superba-smoke" />
      <svg className="superba-scene" viewBox="0 0 400 240" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="superba-beam-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="#fab600" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fab600" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon className="superba-beam" points={beam} />
        <circle className="superba-moon" cx="82" cy="140" r="70" />
        <g className="superba-tower"><Lanterna /></g>
        <path className="superba-sea-back" d="M0 214 C60 200 110 222 170 210 C240 196 300 220 400 204 V240 H0 Z" />
        <path className="superba-sea-front" d="M0 226 C80 214 140 234 220 222 C290 212 340 232 400 220 V240 H0 Z" />
        <path className="superba-foam" d="M0 214 C60 200 110 222 170 210 C240 196 300 220 400 204" />
      </svg>
      <span className="superba-pillar" />
      {SPARKS.map((spark) => <span key={spark} className={`superba-spark is-${spark}`} />)}
      <img className="superba-medal" src="/assets/superba-logo.webp" alt="" />
      <div className="superba-plaque">
        <small>Open · {city}</small>
        <strong>TORNEO REPTILE</strong>
        <em>{fameLabel}</em>
      </div>
    </div>
  );
}
