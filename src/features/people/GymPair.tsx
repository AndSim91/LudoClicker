import { useEffect, useState, type CSSProperties } from "react";
import { GymLayer, SaberLayers } from "./GymLayers";
import { boxAround } from "./gymBox";
import { bodyShape, type FighterBody } from "./fighterBodies";
import { canSpar, exchangeSteps, nextIdleMs, planBout, rollsBout, type GymExchange } from "./gymSparring";

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
  unarmed = false,
  body,
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
  /** Disarmed: no blade, the open hand held out. */
  unarmed?: boolean;
  /** End of the final: a celebration or a defeat stance; overrides everything else. */
  body?: FighterBody;
}) {
  const offset = `${-delay}s`;
  if (body) {
    const shape = bodyShape(body, x, facing);
    return (
      <g className={`gym-fighter ${body.startsWith("win") ? "is-cheer" : "is-sad"}`} style={{ animationDelay: offset }}>
        <circle cx={shape.head[0]} cy={shape.head[1]} r={7} />
        <path d={shape.d} />
        {shape.fist ? <circle className="gym-fist" cx={shape.fist[0]} cy={shape.fist[1]} r={2.6} /> : null}
        <line
          className={shape.off ? "gym-saber is-off" : "gym-saber"}
          x1={shape.blade[0]}
          y1={shape.blade[1]}
          x2={shape.blade[2]}
          y2={shape.blade[3]}
          style={{ color: saber }}
        />
      </g>
    );
  }
  const hand = x + 14 * facing;
  const tip = blade ?? (pose === "guard" ? { x: hand + 4 * facing, y: 76 } : { x: hand + 30 * facing, y: 90 });
  const raised = declare ? ` M${x} 110 L${x - 8 * facing} 96 L${x - 10 * facing} 84` : "";
  const arm = unarmed ? `M${x} 110 L${x + 9 * facing} 104 L${x + 12 * facing} 97` : `M${x} 110 L${hand} 116`;
  return (
    <g className="gym-fighter" style={{ animationDelay: offset }}>
      <circle cx={x} cy={96} r={7} />
      <path d={`M${x} 104 L${x} 128 M${x} 128 L${x - 8} 150 M${x} 128 L${x + 9} 150 ${arm}${raised}`} />
      {unarmed ? null : (
        <line className="gym-saber" x1={hand} y1={116} x2={tip.x} y2={tip.y} style={{ color: saber, animationDelay: offset }} />
      )}
    </g>
  );
}

/**
 * The gym's athlete (GymScene), built from layers: the same figure as Fighter in
 * guard or attack pose, but breathing, stepping and humming on the compositor.
 * Fighter stays a single SVG group for the Arena final.
 */
export function GymActor({
  x,
  facing,
  saber,
  pose = "attack",
  delay = 0,
  step = 0,
}: {
  x: number;
  facing: 1 | -1;
  saber: string;
  pose?: "guard" | "attack";
  delay?: number;
  /** Footwork of a bout, in scene units. */
  step?: number;
}) {
  const offset = `${-delay}s`;
  const hand = x + 14 * facing;
  const tip = pose === "guard" ? { x: hand + 4 * facing, y: 76 } : { x: hand + 30 * facing, y: 90 };
  const geometry: Array<[number, number]> = [
    [x - 8, 150], [x + 9, 150], [x - 7, 89], [x + 7, 89], [hand, 116], [tip.x, tip.y],
  ];
  // The old breathing pivoted on the bottom centre of the figure's fill box.
  const fill = boxAround(geometry, 0);
  const pivotX = fill.x + fill.w / 2;
  const box = boxAround(geometry, 14);
  return (
    <div
      className="gym-actor"
      style={{ "--step": step } as CSSProperties}
    >
      <div
        className="gym-breath"
        style={{ "--pivot-x": pivotX, animationDelay: offset } as CSSProperties}
      >
        <GymLayer box={box} className="gym-body">
          <circle cx={x} cy={96} r={7} />
          <path d={`M${x} 104 L${x} 128 M${x} 128 L${x - 8} 150 M${x} 128 L${x + 9} 150 M${x} 110 L${hand} 116`} />
        </GymLayer>
        <SaberLayers box={box} lines={[[hand, 116, tip.x, tip.y, saber]]} delay={offset} />
      </div>
    </div>
  );
}

// Height at which two attacking blades cross.
const CLASH_Y = 101;
const wiggle = () => Math.round((Math.random() * 4 - 2) * 10) / 10;


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
    <div
      className={sparring ? "gym-pair is-sparring" : "gym-pair"}
      style={{ "--gym-move": `${moveMs}ms` } as CSSProperties}
    >
      <GymActor x={leftX} facing={1} saber={sabers[0]} delay={index * 1.3} step={steps[0]} />
      <GymActor x={rightX} facing={-1} saber={sabers[1]} delay={index * 1.3 + 1.7} step={steps[1]} />
      {clash ? (
        <GymLayer
          key={clash.id}
          box={{ x: clash.x - 16, y: CLASH_Y - 16, w: 32, h: 32 }}
          className="gym-clash"
        >
          <path transform={`translate(${clash.x} ${CLASH_Y})`} d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2 Z" />
        </GymLayer>
      ) : null}
    </div>
  );
}
