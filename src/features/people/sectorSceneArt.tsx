import type { CSSProperties } from "react";
import type { CollaboratorMasteryRole } from "../../game/types";
import { SceneLayer } from "./SceneLayer";

/*
 * The four sector scenes of Modalità Onde (Tavola 4, 06/10), drawn in the units
 * of a 520 × 106 viewBox. What stands still is one SVG; what moves is a
 * SceneLayer (transform and opacity only, see sector-scenes.css).
 */

const INK = "#021e33";

/** A passer-by: head and coat, in scene units, standing at x = 0. */
function Walker({ y, r, ground = 86 }: { y: number; r: number; ground?: number }) {
  return (
    <g fill={INK}>
      <circle cx={0} cy={y} r={r} />
      <path d={`M${-r} ${y + r * 1.1}h${r * 2}l${r * 0.3} ${ground - y - r * 1.1}h${-r * 2.6}z`} />
    </g>
  );
}

/** Two athletes crossing blades, the picture of a post in the Social feed. */
function Duel({ y, left, right }: { y: number; left: string; right: string }) {
  return (
    <g transform={`translate(204 ${y})`}>
      <rect width={112} height={62} rx={6} fill="#0e4563" />
      <rect width={112} height={48} rx={6} fill="#03324d" />
      <rect y={40} width={112} height={8} fill="#0a3a57" />
      <g fill={INK}>
        <circle cx={42} cy={16} r={4.4} /><path d="M38.8 20.6h6.4l1.3 12h-9z" /><path d="M39.2 32.6l-4 8h3.4l2.6-6.6zM44.6 32.6l3.4 8h-3.4l-2-6.6z" />
        <circle cx={70} cy={16} r={4.4} /><path d="M66.8 20.6h6.4l1.3 12h-9z" /><path d="M67.4 32.6l-3.4 8h3.4l2-6.6zM72.8 32.6l4 8h-3.4l-2.6-6.6z" />
      </g>
      <path d="M46 24 L63 7" stroke={left} strokeWidth={6} strokeLinecap="round" opacity={0.3} />
      <path d="M66 24 L49 7" stroke={right} strokeWidth={6} strokeLinecap="round" opacity={0.3} />
      <path d="M46 24 L63 7" stroke={left} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M66 24 L49 7" stroke={right} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={56} cy={11.5} r={3} fill="#fbf1dc" opacity={0.85} />
      <rect x={8} y={53} width={74} height={3.5} rx={1.75} fill="#fbf1dc" opacity={0.5} />
      <rect x={88} y={52} width={14} height={5} rx={2.5} fill="#ffa39a" />
    </g>
  );
}

const DUELS: Array<[string, string]> = [
  ["#6cd3d6", "#c9a7ff"],
  ["#f0b85a", "#ff6b6b"],
  ["#8cc4ff", "#7fdcae"],
];

const HEART = "M6 11.5S0.5 8 0.5 4.4A2.7 2.7 0 0 1 6 3.2a2.7 2.7 0 0 1 5.5 1.2C11.5 8 6 11.5 6 11.5z";

function SocialScene() {
  return (
    <>
      <svg className="sector-scene-backdrop" viewBox="0 0 520 106" preserveAspectRatio="xMidYMid meet">
        <rect x={196} y={6} width={128} height={170} rx={15} fill="#082f48" stroke="#6cd3d6" strokeOpacity={0.55} strokeWidth={2} />
        <rect x={249} y={11} width={22} height={3} rx={1.5} fill="#6cd3d6" opacity={0.4} />
      </svg>
      {/* The feed: three posts drawn twice, scrolled by half their height. */}
      <div className="sector-scene-layer scene-feed-window" style={{ "--x": 204, "--y": 18, "--w": 112, "--h": 160 } as CSSProperties}>
        <div className="scene-feed" style={{ "--h": 408 } as CSSProperties}>
          <svg viewBox="204 0 112 408">
            {[0, 1].flatMap((round) => DUELS.map(([left, right], index) => (
              <Duel key={`${round}-${index}`} y={round * 204 + index * 68} left={left} right={right} />
            )))}
          </svg>
        </div>
      </div>
      {[
        { x: 336, color: "#ffa39a" },
        { x: 172, color: "#f0b85a" },
      ].map(({ x, color }, index) => (
        <SceneLayer key={x} box={{ x, y: 74, w: 12, h: 12 }} className={`scene-heart is-${index + 1}`}>
          <path transform={`translate(${x} 74)`} d={HEART} fill={color} />
        </SceneLayer>
      ))}
    </>
  );
}

const WAVE_A = "M0 14 Q62 4 125 14 T250 14 T375 14 T500 14 T625 14 T750 14 T875 14 T1000 14 T1125 14 V40 H0Z";
const WAVE_B = "M0 14 Q50 6 100 14 T200 14 T300 14 T400 14 T500 14 T600 14 T700 14 T800 14 T900 14 T1000 14 T1100 14 V40 H0Z";

function EventsScene() {
  return (
    <>
      <svg className="sector-scene-backdrop" viewBox="0 0 520 106" preserveAspectRatio="xMidYMid meet">
        <rect x={-600} y={-60} width={1720} height={230} fill="#0b4f6e" />
      </svg>
      <SceneLayer box={{ x: 0, y: 46, w: 1040, h: 50 }} className="scene-sea">
        <path transform="translate(0 46)" d={WAVE_A} fill="#146f7b" opacity={0.75} />
        <path transform="translate(0 56)" d={WAVE_B} fill="#177c89" />
      </SceneLayer>
      <svg className="sector-scene-backdrop" viewBox="0 0 520 106" preserveAspectRatio="xMidYMid meet">
        <rect x={-600} y={84} width={1720} height={80} fill="#cdb98c" opacity={0.38} />
        <path d="M180 34 L250 14 L320 34 Z" fill="#34506f" />
        <path d="M180 34 H320 V40 H180Z" fill="#26405c" />
        <path d="M180 40 l7 5 l7 -5 l7 5 l7 -5 l7 5 l7 -5 l7 5 l7 -5 l7 5 l7 -5 l7 5 l7 -5 l7 5 l7 -5 l7 5 l7 -5 l7 5 l7 -5 l7 5 l7 -5Z" fill="#26405c" />
        <path d="M186 40 V86 M314 40 V86" stroke="#c8d3dc" strokeOpacity={0.7} strokeWidth={3} />
        <g fill={INK}>
          <circle cx={234} cy={52} r={5} /><path d="M229 58h10l2 18h-14z" /><path d="M229 76l-4 10h4l3-8zM239 76l4 10h-4l-3-8z" />
          <circle cx={268} cy={52} r={5} /><path d="M263 58h10l2 18h-14z" /><path d="M263 76l-4 10h4l3-8zM273 76l4 10h-4l-3-8z" />
        </g>
        {/* Roll-up of the school: black, the Ordine's emblem in white. */}
        <rect x={350} y={84} width={34} height={4} rx={1} fill="#8aa0b0" />
        <rect x={352} y={22} width={30} height={62} rx={1.5} fill="#0b0d10" stroke="#3a4450" strokeWidth={0.8} />
        <image href="/assets/orders/onde.webp" x={356} y={30} width={22} height={29} />
        <rect x={356} y={66} width={22} height={2.5} rx={1} fill="#f4f1ea" />
        <rect x={359} y={71} width={16} height={2} rx={1} fill="#f4f1ea" opacity={0.5} />
      </svg>
      <SceneLayer box={{ x: 236, y: 38, w: 30, h: 26 }} className="scene-saber">
        <path d="M239 62 L256 40" stroke="#c9a7ff" strokeWidth={3} strokeLinecap="round" />
        <path d="M263 62 L247 40" stroke="#6cd3d6" strokeWidth={3} strokeLinecap="round" />
      </SceneLayer>
      <SceneLayer box={{ x: -30, y: 58, w: 12, h: 30 }} className="scene-walker">
        <g transform="translate(-10 0)"><Walker y={63} r={4.4} /></g>
      </SceneLayer>
      <SceneLayer box={{ x: -30, y: 60, w: 12, h: 28 }} className="scene-walker is-browsing">
        <g transform="translate(-10 0)"><Walker y={66} r={4} /></g>
      </SceneLayer>
    </>
  );
}

function EquipmentScene() {
  return (
    <>
      <svg className="sector-scene-backdrop" viewBox="0 0 520 106" preserveAspectRatio="xMidYMid meet">
        <rect x={-600} y={90} width={1720} height={80} fill="#0a3a57" />
        <rect x={96} y={34} width={132} height={5} rx={2} fill="#3b5566" />
        <rect x={96} y={80} width={132} height={8} rx={2} fill="#3b5566" />
        <rect x={96} y={34} width={5} height={54} fill="#3b5566" />
        <rect x={223} y={34} width={5} height={54} fill="#3b5566" />
        <path d="M212 66 V12" stroke="#7fdcae" strokeWidth={3.5} strokeLinecap="round" opacity={0.9} />
        <path d="M112 80 V66 M130 80 V66 M148 80 V66 M166 80 V66 M184 80 V66 M212 80 V66" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        <rect x={280} y={74} width={150} height={8} rx={2} fill="#3b5566" />
        <rect x={288} y={82} width={6} height={12} fill="#3b5566" />
        <rect x={416} y={82} width={6} height={12} fill="#3b5566" />
        <rect x={296} y={64} width={22} height={9} rx={2} fill={INK} stroke="#5a7a8c" />
        <rect x={318} y={66.5} width={96} height={4} rx={2} fill="#e6f4f1" opacity={0.18} />
      </svg>
      <SceneLayer box={{ x: 108, y: 9, w: 80, h: 60 }} className="scene-rack">
        {[["112", "#6cd3d6"], ["130", "#c9a7ff"], ["148", "#f0b85a"], ["166", "#6cd3d6"], ["184", "#8cc4ff"]].map(([x, color]) => (
          <path key={x} d={`M${x} 66 V12`} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
        ))}
      </SceneLayer>
      <SceneLayer box={{ x: 316, y: 63, w: 100, h: 10 }} className="scene-blade-glow">
        <rect x={316} y={63} width={100} height={10} rx={5} fill="#6cd3d6" />
      </SceneLayer>
      <SceneLayer box={{ x: 318, y: 66.5, w: 96, h: 4 }} className="scene-blade">
        <rect x={318} y={66.5} width={96} height={4} rx={2} fill="#6cd3d6" />
      </SceneLayer>
      <SceneLayer box={{ x: 350, y: 24, w: 32, h: 32 }} className="scene-wrench">
        <path d="M372 26a7 7 0 0 0-6.6 9.4L352 48.8l4.6 4.6 13.4-13.4a7 7 0 0 0 9.4-6.6l-4.6 1.8-2.8-2.8z" fill="none" stroke="#f0b85a" strokeWidth={2.4} strokeLinejoin="round" />
      </SceneLayer>
      <SceneLayer box={{ x: 350, y: 56, w: 12, h: 8 }} className="scene-sparks">
        <circle cx={354} cy={60} r={1.7} fill="#f0b85a" />
        <circle cx={359} cy={58} r={1.4} fill="#fbf1dc" />
        <circle cx={352} cy={62} r={1.4} fill="#f0b85a" />
      </SceneLayer>
    </>
  );
}

/** The Ordine's emblem, simplified for the Gadget drawings (white on navy). */
function Emblem({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 20})`}>
      <path d="M0 -13 C0.8 -6 2.4 -1 4.6 3 C2.6 2 1.2 2.6 0 5 C-1.2 2.6 -2.6 2 -4.6 3 C-2.4 -1 -0.8 -6 0 -13Z M0 -2 L1.2 1 L0 2.6 L-1.2 1Z" fill="currentColor" fillRule="evenodd" />
      <path d="M-8 6 C-6 3 -3.5 3.6 -2.8 5.4 M8 6 C6 3 3.5 3.6 2.8 5.4" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
    </g>
  );
}

const NAVY = "#1d3557";
const STALL = "translate(260 94) scale(1.2) translate(-260 -94)";

function GadgetScene() {
  return (
    <>
      <svg className="sector-scene-backdrop" viewBox="0 0 520 106" preserveAspectRatio="xMidYMid meet">
        <rect x={-600} y={90} width={1720} height={80} fill="#0a3a57" />
        <g transform={STALL} color="#fff">
          <path d="M150 20 H370 V30 H150Z" fill="#f4f1ea" />
          <path d="M150 20h20v10h-20zM190 20h20v10h-20zM230 20h20v10h-20zM270 20h20v10h-20zM310 20h20v10h-20zM350 20h20v10h-20z" fill={NAVY} />
          <path d="M150 30 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0 q10 8 20 0Z" fill={NAVY} />
          <path d="M156 30 V90 M364 30 V90" stroke="#8aa0b0" strokeWidth={3} />
          {/* T-shirt on its hanger */}
          <path d="M320 38 v4" stroke="#8aa0b0" strokeWidth={1.2} />
          <path d="M310 44 h20 l7 5 l-3 5 l-4 -2 v12 h-20 v-12 l-4 2 l-3 -5 z" fill="#f4f1ea" />
          <g color="#1f2a36"><Emblem x={320} y={56} size={10} /></g>
          {/* Stall */}
          <rect x={166} y={70} width={188} height={6} rx={1} fill="#f4f1ea" />
          <path d="M166 76 H354 V90 H166Z" fill={NAVY} />
          <path d="M166 76 H354" stroke="#e0a64a" strokeWidth={1.5} />
          <Emblem x={260} y={84} size={12} />
          {/* Mug, keychain, wristband, cap, stickers */}
          <rect x={182} y={56} width={16} height={14} rx={2} fill={NAVY} />
          <path d="M198 59 a4 4 0 0 1 0 8" fill="none" stroke={NAVY} strokeWidth={2.4} />
          <Emblem x={190} y={64} size={9} />
          <circle cx={215} cy={56} r={3} fill="none" stroke="#c8d3dc" strokeWidth={1.3} />
          <path d="M209 60 h12 v5 l-6 5 l-6 -5z" fill={NAVY} stroke="#c8d3dc" strokeWidth={1} />
          <Emblem x={215} y={65} size={7} />
          <rect x={232} y={60} width={18} height={10} rx={3} fill={NAVY} />
          <path d="M234 62 v6 M237 62 v6 M240 62 v6 M243 62 v6 M246 62 v6" stroke="#2c4a70" strokeWidth={1} />
          <Emblem x={241} y={65.5} size={8} />
          <path d="M262 70 q2 -14 14 -14 q12 0 13 14z" fill={NAVY} />
          <path d="M286 69 h10 q-2 3 -10 3z" fill="#2c4a70" />
          <Emblem x={275} y={64} size={9} />
          <rect x={300} y={60} width={16} height={10} rx={1.5} fill="#f4f1ea" />
          <circle cx={305} cy={65} r={3} fill={NAVY} />
          <circle cx={312} cy={65} r={2.2} fill="#e0a64a" />
          <path d="M184 72h12v3h-12zM235 72h12v3h-12zM268 72h12v3h-12z" fill="#e0a64a" />
          {/* Seller */}
          <g fill={INK}><circle cx={336} cy={52} r={5} /><path d="M330 58h12l2 12h-16z" /></g>
        </g>
      </svg>
      {/* The hoodie hangs from the awning and sways: STALL maps (187, 38) to (172.4, 26.8). */}
      <SceneLayer box={{ x: 172.4, y: 26.8, w: 34.8, h: 33.6 }} viewBox="187 38 29 28" className="scene-hoodie">
        <path d="M200 38 v4" stroke="#8aa0b0" strokeWidth={1.2} />
        <path d="M190 44 h20 l6 6 l-3 4 l-3 -2 v14 h-20 v-14 l-3 2 l-3 -4 z" fill={NAVY} />
        <path d="M196 44 q4 5 8 0" fill="none" stroke="#2c4a70" strokeWidth={2} />
        <g color="#fff"><Emblem x={200} y={57} size={10} /></g>
      </SceneLayer>
      <SceneLayer box={{ x: -30, y: 52, w: 16, h: 38 }} className="scene-walker">
        <g transform="translate(-8 0)"><Walker y={58} r={5.5} ground={90} /><rect x={6} y={70} width={7} height={8} rx={1} fill="#e0a64a" /></g>
      </SceneLayer>
      <SceneLayer box={{ x: -30, y: 55, w: 14, h: 35 }} className="scene-walker is-browsing is-slow">
        <g transform="translate(-9 0)"><Walker y={61} r={5} ground={90} /></g>
      </SceneLayer>
    </>
  );
}

/** The scene of one sector; the Centro didattico has none. */
export function SectorSceneArt({ role }: { role: CollaboratorMasteryRole }) {
  switch (role) {
    case "writing": return <SocialScene />;
    case "events": return <EventsScene />;
    case "equipment": return <EquipmentScene />;
    case "gadget": return <GadgetScene />;
    default: return null;
  }
}
