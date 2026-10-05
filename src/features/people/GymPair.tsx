import { useEffect, useState, type CSSProperties } from "react";
import { motionReduced } from "../../shared/motion";
import { exchangeSteps, nextIdleMs, planBout, rollsBout, type GymExchange } from "./gymSparring";

// A stick athlete: "guard" holds the blade upright, "attack" reaches towards
// a partner standing 62 units away, so two attacks cross in the middle.
export function Fighter({
  x,
  facing,
  saber,
  pose = "attack",
  delay = 0,
  tip: blade,
  declare = false,
}: {
  x: number;
  facing: 1 | -1;
  saber: string;
  pose?: "guard" | "attack";
  /** Negative offset (s) of the idle loops, so no two athletes breathe in step. */
  delay?: number;
  /** Blade tip mid-cut (the Arena final); overrides the pose. */
  tip?: { x: number; y: number };
  /** Free hand raised: the touched athlete calls «OH!». */
  declare?: boolean;
}) {
  const hand = x + 14 * facing;
  const tip = blade ?? (pose === "guard" ? { x: hand + 4 * facing, y: 76 } : { x: hand + 30 * facing, y: 90 });
  const offset = `${-delay}s`;
  const raised = declare ? ` M${x} 110 L${x - 8 * facing} 96 L${x - 10 * facing} 84` : "";
  return (
    <g className="gym-fighter" style={{ animationDelay: offset }}>
      <circle cx={x} cy={96} r={7} />
      <path d={`M${x} 104 L${x} 128 M${x} 128 L${x - 8} 150 M${x} 128 L${x + 9} 150 M${x} 110 L${hand} 116${raised}`} />
      <line className="gym-saber" x1={hand} y1={116} x2={tip.x} y2={tip.y} style={{ color: saber, animationDelay: offset }} />
    </g>
  );
}

// Height at which two attacking blades cross.
const CLASH_Y = 101;
const wiggle = () => Math.round((Math.random() * 4 - 2) * 10) / 10;

function canSpar(): boolean {
  // The gym is drawn only in Modalità Onde: no bouts behind the Outlook camouflage.
  return !document.hidden && document.documentElement.dataset.theme === "dark" && !motionReduced();
}

/**
 * Two athletes facing each other. Each pair lives on its own: it breathes most of the
 * time, and now and then a random roll starts a bout of a few seconds.
 */
export function GymPair({
  leftX,
  rightX,
  sabers,
  index,
}: {
  leftX: number;
  rightX: number;
  sabers: [string, string];
  index: number;
}) {
  const [steps, setSteps] = useState<[number, number]>([0, 0]);
  const [moveMs, setMoveMs] = useState(300);
  const [sparring, setSparring] = useState(false);
  const [clash, setClash] = useState<{ id: number; x: number } | null>(null);

  useEffect(() => {
    let timer = 0;
    let clashId = 0;
    const later = (ms: number, next: () => void) => {
      timer = window.setTimeout(next, ms);
    };
    const move = (ms: number, next: [number, number]) => {
      setMoveMs(ms);
      setSteps(next);
    };
    const idle = () => later(nextIdleMs(Math.random), () => {
      if (!canSpar() || !rollsBout(Math.random)) {
        idle();
        return;
      }
      setSparring(true);
      fight(planBout(Math.random), 0);
    });
    const fight = (exchanges: GymExchange[], at: number) => {
      const exchange = exchanges[at];
      if (!exchange) {
        setSparring(false);
        move(400, [0, 0]);
        idle();
        return;
      }
      const landed = exchangeSteps(exchange);
      move(exchange.attackMs, landed);
      later(exchange.attackMs, () => {
        if (exchange.clash) {
          clashId += 1;
          setClash({ id: clashId, x: (leftX + rightX) / 2 + (landed[0] + landed[1]) / 2 });
        }
        // Footwork between exchanges: nobody goes back to exactly the same spot.
        move(exchange.recoverMs, [wiggle(), wiggle()]);
        later(exchange.recoverMs, () => fight(exchanges, at + 1));
      });
    };
    idle();
    return () => window.clearTimeout(timer);
  }, [leftX, rightX]);

  return (
    <g
      className={sparring ? "gym-pair is-sparring" : "gym-pair"}
      style={{ "--gym-move": `${moveMs}ms` } as CSSProperties}
    >
      <g className="gym-step" style={{ transform: `translateX(${steps[0]}px)` }}>
        <Fighter x={leftX} facing={1} saber={sabers[0]} delay={index * 1.3} />
      </g>
      <g className="gym-step" style={{ transform: `translateX(${steps[1]}px)` }}>
        <Fighter x={rightX} facing={-1} saber={sabers[1]} delay={index * 1.3 + 1.7} />
      </g>
      {clash ? (
        <g transform={`translate(${clash.x} ${CLASH_Y})`}>
          <g key={clash.id} className="gym-clash">
            <path d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2 Z" />
          </g>
        </g>
      ) : null}
    </g>
  );
}
