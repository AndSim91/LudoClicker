import { useEffect, useState, type CSSProperties } from "react";
import { STRIKES, addExchanges, disarm, type AddBoutEvent, type BoutAssault, type BoutEvent } from "../arena/boutChoreography";
import { Fighter } from "../people/GymPair";
import type { FighterBody } from "../people/fighterBodies";
import { FinalArena } from "../tournaments/FinalArena";
import { DUEL_LEFT, DUEL_RIGHT, applyEvent, startView, type DuelView } from "../tournaments/finalDuelTimeline";

/*
 * Tappa 1 · «Podio» (concept v4 approved 07/10/2026, rebuilt 08/10): in the Arena
 * of the Scolastico two generic pupils fight with the real choreography
 * (boutChoreography.ts); one or two exchanges, then the left one (gold) always
 * wins with a Disarmo, no «Disarmo · SAPD» label. End stances, then the podium
 * rises from the floor, the school banner drops over the Ordine one, the three
 * land (3rd red, 2nd blue, 1st gold), sparks, the photo flash, the caption.
 * At most 8 s. «Riduci animazioni»: the final frame of the podium.
 */

export const TAPPA_ONE_DURATION_MS = 8_000;

const GOLD = "#f5b700";
const BLUE = "#3d8bff";
const RED = "#e5322d";
const STAGE = { left: DUEL_LEFT, right: DUEL_RIGHT };
const ENGAGE_MS = 600;
const EXCHANGES_MS = 1_000;
const OH_MS = 900;
const CHEER_MS = 1_200;

/** The bout: exchanges, the Disarmo, the «OH!», then straight to the end stances. */
function planBout(): { events: BoutEvent[]; podiumAt: number } {
  const events: BoutEvent[] = [];
  const add: AddBoutEvent = (t, event) => events.push({ t: Math.round(t), ...event } as BoutEvent);
  const assault: BoutAssault = { winner: "a", strike: STRIKES[Math.floor(Math.random() * STRIKES.length)] };
  const at = addExchanges(add, STAGE, ENGAGE_MS, EXCHANGES_MS, Math.random);
  disarm(add, STAGE, at, assault);
  // The cut ends with the «OH!» (the point): no going back on guard, no sword picked up.
  const ohAt = events.find((event) => event.type === "point")?.t ?? at;
  const kept = events.filter((event) => event.t <= ohAt);
  const endAt = ohAt + OH_MS;
  kept.push(
    { t: endAt, type: "pose", side: "a", pose: { pose: "guard", body: "win-sky" } },
    { t: endAt, type: "pose", side: "b", pose: { pose: "guard", body: "lose-head" } },
  );
  return { events: kept.sort((x, y) => x.t - y.t), podiumAt: endAt + CHEER_MS };
}

const STEPS = [
  { place: 2, x: 262, width: 56, height: 22, className: "t1-step-2" },
  { place: 1, x: 320, width: 58, height: 34, className: "t1-step-1" },
  { place: 3, x: 378, width: 56, height: 14, className: "t1-step-3" },
] as const;
const FLOOR_Y = 246;
const PODIUM_ATHLETES: readonly { place: 1 | 2 | 3; saber: string; body: FighterBody; delay: number }[] = [
  { place: 3, saber: RED, body: "win-fist", delay: 0.75 },
  { place: 2, saber: BLUE, body: "win-v", delay: 0.9 },
  { place: 1, saber: GOLD, body: "win-sky", delay: 1.05 },
];
const SPARKS = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2;
  const radius = 26 + (index % 3) * 9;
  return {
    x: 320 + Math.cos(angle) * radius,
    y: 60 + Math.sin(angle) * radius * 0.8,
    sx: `${Math.round(Math.cos(angle) * 22)}px`,
    sy: `${Math.round(Math.sin(angle) * 22)}px`,
    delay: 1.3 + (index % 4) * 0.05,
  };
});

function Podium() {
  const top = (place: number) => FLOOR_Y - STEPS.find((step) => step.place === place)!.height;
  const x = (place: number) => STEPS.find((step) => step.place === place)!.x;
  return (
    <svg className="t1-podium-layer" viewBox="0 0 640 300" aria-hidden="true">
      {STEPS.map((step, index) => (
        <g key={step.place} className={`t1-step ${step.className}`} style={{ animationDelay: `${index * 0.15}s` }}>
          <rect x={step.x - step.width / 2} y={FLOOR_Y - step.height} width={step.width} height={step.height} rx={2} />
          <text className="t1-step-num" x={step.x} y={FLOOR_Y - step.height / 2 + 6} textAnchor="middle">{step.place}</text>
        </g>
      ))}
      <g className="t1-banner-drop">
        <g transform="translate(320 0) scale(1.15)">
          <path d="M-30 0 H30 V70 L0 86 L-30 70 Z" fill="#0b2238" stroke="#e9b949" strokeWidth={2.4} strokeLinejoin="round" />
          <image href="/assets/ordine-emblem.webp" x={-19} y={8} width={38} height={50} />
        </g>
      </g>
      {PODIUM_ATHLETES.map((athlete) => (
        <g key={athlete.place} transform={`translate(${x(athlete.place)} ${top(athlete.place)}) scale(1.05) translate(0 -150)`}>
          <g className="t1-land" style={{ animationDelay: `${athlete.delay}s` }}>
            <Fighter x={0} facing={1} saber={athlete.saber} body={athlete.body} />
          </g>
        </g>
      ))}
      <g className="t1-sparks">
        {SPARKS.map((spark, index) => (
          <circle
            key={index}
            cx={spark.x}
            cy={spark.y}
            r={2.2}
            style={{ animationDelay: `${spark.delay}s`, "--sx": spark.sx, "--sy": spark.sy } as CSSProperties}
          />
        ))}
      </g>
      <rect className="t1-flash" width={640} height={300} />
      <text className="t1-caption" x={320} y={288} textAnchor="middle">PRIMO TORNEO SCOLASTICO</text>
    </svg>
  );
}

export function TappaOneArt({ still }: { still: boolean }) {
  const [bout] = useState(planBout);
  const [view, setView] = useState<DuelView>(() => startView({}));
  const [podium, setPodium] = useState(still);

  useEffect(() => {
    if (still) return;
    const timers = [window.setTimeout(() => setView((current) => applyEvent(current, { t: 0, type: "engage" })), 0)];
    for (const event of bout.events) {
      timers.push(window.setTimeout(() => setView((current) => applyEvent(current, event)), event.t));
    }
    timers.push(window.setTimeout(() => setPodium(true), bout.podiumAt));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [bout, still]);

  return (
    <div className={`moment-art moment-tappa${podium ? " is-podium" : ""}${still ? " is-still" : ""}`} aria-hidden="true">
      <div className="t1-duel">
        <FinalArena level="school" view={view} judges={2} sabers={{ a: GOLD, b: BLUE }} />
      </div>
      {podium ? <Podium /> : null}
    </div>
  );
}
