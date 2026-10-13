import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { GYM_SABER_COLORS, type GymRarityCounts } from "../../content/gymStages";
import type { FormId } from "../../game/types";
import { motionReduced } from "../../shared/motion";
import { ATHLETE_INK, athleteBody } from "./athleteShape";
import {
  ROUND_BACK_MS,
  ROUND_STOP_MS,
  SCENE_HEIGHT,
  SCENE_TOP,
  nextRoundDelayMs,
  pickStaffMove,
  planInstructorScene,
  type KataLevel,
  type SceneStudent,
  type StaffMove,
} from "./instructorLesson";

/*
 * «Lezione degli Istruttori» (13/10, Andrea): the scene above the Ufficio
 * formazione in the Instructors card, Modalità Onde only. Static parts (gym,
 * bodies) are SVG; every moving part (arms, staffs, the walking instructor, the
 * phone) is its own small HTML layer that the compositor turns or slides with
 * transform and opacity (instructor-scene.css). Still off screen, with «Riduci
 * animazioni» and without students.
 */

const TUNIC = { instructor: "#1d5a45", technician: "#a68ad6" };
const BELT = "#5b3a22";
const INSTRUCTOR_BLADE = GYM_SABER_COLORS.legendary;

function Blade({ x1, y1, x2, y2, color, width = 4 }: { x1: number; y1: number; x2: number; y2: number; color: string; width?: number }) {
  return (
    <g strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width * 2} opacity={0.28} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={width * 0.4} opacity={0.7} />
    </g>
  );
}

/** The instructor's braid (concept T1, 13/10): short, the belt's brown, half width. */
function Braid({ x, f }: { x: number; f: 1 | -1 }) {
  const kx = x + 4.5 * f;
  const links = [0, 2.4, 4.8, 7.2];
  return (
    <g fill="none" stroke={BELT} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
      {links.map((y) => <path key={y} d={`M${kx - 0.65} ${123 + y} L${kx} ${124.6 + y} L${kx + 0.65} ${123 + y}`} />)}
      <circle cx={kx} cy={122} r={1} fill={BELT} stroke="none" />
    </g>
  );
}

/** LudoSport tunic (Andrea's photos): crossed collar, front slit, brown belt, the braid. */
function Tunic({ x, f, color }: { x: number; f: 1 | -1; color: string }) {
  return (
    <>
      <path d={`M${x - 6} 103 L${x + 6} 103 L${x + 9} 139 L${x + 1.2} 139 L${x} 131 L${x - 1.2} 139 L${x - 9} 139 Z`} fill={color} />
      <path d={`M${x - 5 * f} 103 L${x + 4 * f} 113`} stroke="#000" strokeOpacity={0.3} strokeWidth={1.6} fill="none" />
      <rect x={x - 7.4} y={120} width={14.8} height={3.2} rx={1} fill={BELT} />
      <Braid x={x} f={f} />
    </>
  );
}

/** A box of the scene, 100 × 100 units around a figure standing on x (y 60–160). */
function FigureBox({ x, className, style, children }: { x: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={`iscene-box${className ? ` ${className}` : ""}`} style={{ "--bx": x, ...style } as CSSProperties}>
      {children}
    </div>
  );
}

const boxView = (x: number) => `${x - 50} 60 100 100`;

/** The staff turns around its hilt (V1 Otto, V3 Mulino, V4 Spazzata e cavatappi), a new move at every loop. */
function Staff({ x, f, color, level, delay }: { x: number; f: 1 | -1; color: string; level: KataLevel; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useMemo<StaffMove>(() => pickStaffMove(undefined), []);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const next = (event: AnimationEvent) => {
      if (event.target !== element) return;
      element.dataset.move = pickStaffMove(element.dataset.move as StaffMove);
      // Restarted right at the loop's end, still in step with the arm.
      element.style.animationDelay = "0s";
    };
    element.addEventListener("animationiteration", next);
    return () => element.removeEventListener("animationiteration", next);
  }, []);
  const hx = x + 12 * f;
  return (
    <div className="iscene-staff-pos" style={{ "--hx": 50 + 12 * f, "--dir": f } as CSSProperties}>
      <div ref={ref} className={`iscene-staff k${level}`} data-move={first} style={{ "--dir": f, animationDelay: `${delay}s` } as CSSProperties}>
        <svg viewBox={`${hx - 35} 80 70 70`} aria-hidden="true">
          <Blade x1={hx} y1={107} x2={hx} y2={84} color={color} width={3.4} />
          <Blade x1={hx} y1={123} x2={hx} y2={146} color={color} width={3.4} />
          <line x1={hx} y1={107} x2={hx} y2={123} stroke="#4a5866" strokeWidth={3.6} strokeLinecap="round" />
          <line x1={hx} y1={112.5} x2={hx} y2={117.5} stroke="#8fa3b3" strokeWidth={3.9} />
        </svg>
      </div>
    </div>
  );
}

/** One arm with its weapon, turning at the shoulder on the kata's beats. */
function Arm({ x, f, level, delay, children, back = false, amplitude = 1 }: {
  x: number; f: 1 | -1; level: KataLevel; delay: number; children: ReactNode; back?: boolean; amplitude?: number;
}) {
  return (
    <div className={`iscene-arm k${level}${back ? " is-back" : ""}`} style={{ "--dir": f * amplitude, animationDelay: `${delay}s` } as CSSProperties}>
      <svg viewBox={boxView(x)} aria-hidden="true">{children}</svg>
    </div>
  );
}

/** An athlete of the game (athleteShape.ts) doing the Form: the body still, the arms moving. */
function Pupil({ student, level }: { student: SceneStudent; level: KataLevel }) {
  const { x, weapon, delay } = student;
  const f = -1 as const;
  const color = GYM_SABER_COLORS[student.rarity];
  const hand = x + 14 * f;
  return (
    <FigureBox x={x} className={student.back ? "is-back-row" : undefined}>
      {weapon === "dual" ? (
        <Arm x={x} f={f} level={level} delay={delay} back>
          <path className="iscene-limb" d={`M${x} 110 L${x + 11 * f} 118`} />
          <Blade x1={x + 11 * f} y1={118} x2={x + 15 * f} y2={91} color={color} width={3.2} />
        </Arm>
      ) : null}
      <svg viewBox={boxView(x)} aria-hidden="true">
        <path className="iscene-limb" d={athleteBody(x)} />
        <circle cx={x} cy={96} r={7} fill={ATHLETE_INK} />
      </svg>
      {weapon === "staff" ? (
        <div className={`iscene-arm k${level}`} style={{ "--dir": f * 0.6, animationDelay: `${delay}s` } as CSSProperties}>
          <svg viewBox={boxView(x)} aria-hidden="true"><path className="iscene-limb" d={`M${x} 110 L${x + 12 * f} 115`} /></svg>
          <Staff x={x} f={f} color={color} level={level} delay={delay} />
        </div>
      ) : (
        <Arm x={x} f={f} level={level} delay={delay}>
          <path className="iscene-limb" d={`M${x} 110 L${hand} 116`} />
          {weapon === "dual"
            ? <Blade x1={hand} y1={116} x2={hand + 3 * f} y2={89} color={color} width={3.4} />
            : <Blade x1={hand} y1={116} x2={hand + 4 * f} y2={77} color={color} />}
        </Arm>
      )}
    </FigureBox>
  );
}

function Instructor({ x, tunic, level }: { x: number; tunic: string; level: KataLevel }) {
  const hand = x + 14;
  return (
    <FigureBox x={x}>
      <svg viewBox={boxView(x)} aria-hidden="true">
        <path className="iscene-limb" d={athleteBody(x)} />
        <Tunic x={x} f={1} color={tunic} />
        <circle cx={x} cy={96} r={7} fill={ATHLETE_INK} />
      </svg>
      <Arm x={x} f={1} level={level} delay={0}>
        <path className="iscene-limb" d={`M${x} 110 L${hand} 116`} />
        <Blade x1={hand} y1={116} x2={hand + 4} y2={77} color={INSTRUCTOR_BLADE} />
      </Arm>
    </FigureBox>
  );
}

/** Walking between the rows, blade off, two leg frames (athleteWalk). */
function Walker({ x, f, tunic }: { x: number; f: 1 | -1; tunic: string }) {
  return (
    <FigureBox x={x} className="is-walking">
      <svg viewBox={boxView(x)} aria-hidden="true">
        <path className="iscene-limb" d={`M${x} 104 L${x} 128 M${x} 110 L${x + 9 * f} 124`} />
        <Tunic x={x} f={f} color={tunic} />
        <circle cx={x} cy={96} r={7} fill={ATHLETE_INK} />
        <line x1={x + 9 * f} y1={124} x2={x + 12 * f} y2={132} stroke="#4a5866" strokeWidth={3.4} strokeLinecap="round" />
      </svg>
      <div className="iscene-step"><svg viewBox={boxView(x)} aria-hidden="true"><path className="iscene-limb" d={`M${x} 128 L${x - 8} 150 M${x} 128 L${x + 9} 150`} /></svg></div>
      <div className="iscene-step is-b"><svg viewBox={boxView(x)} aria-hidden="true"><path className="iscene-limb" d={`M${x} 128 L${x - 2} 150 M${x} 128 L${x + 3} 150`} /></svg></div>
    </FigureBox>
  );
}

/** No course running: the instructor sits in the corner scrolling the socials (the seated Style judge). */
function Scroller({ tunic }: { tunic: string }) {
  const x = 26;
  const hx = x - 3;
  return (
    <FigureBox x={x}>
      <svg viewBox={boxView(x)} aria-hidden="true">
        <path d={`M${x - 12} 136 H${x + 6} M${x - 11} 136 V115 M${x - 10} 136 V150 M${x + 4} 136 V150`} stroke="#3b5566" strokeWidth={3} fill="none" strokeLinecap="round" />
        <path className="iscene-limb is-thin" d={`M${hx} 113 L${hx} 133 L${x + 10} 133 L${x + 11} 150`} />
        <path d={`M${hx - 5} 112 L${hx + 5} 112 L${hx + 6} 132 L${x + 9} 131 L${x + 10} 138 L${hx - 7} 138 Z`} fill={tunic} />
        <rect x={hx - 6} y={124} width={12} height={3} rx={1} fill={BELT} />
        <circle cx={hx + 2} cy={108} r={6.5} fill={ATHLETE_INK} />
        <path className="iscene-limb is-thin" d={`M${hx} 118 L${hx + 6} 127 L${hx + 10} 123`} />
        <rect x={hx + 9} y={114} width={6} height={9} rx={1} fill={ATHLETE_INK} stroke="#6cd3d6" strokeWidth={1} />
      </svg>
      <div className="iscene-phone-glow"><svg viewBox={boxView(x)} aria-hidden="true"><rect x={hx + 9} y={114} width={6} height={9} rx={1} fill="#6cd3d6" /></svg></div>
      <div className="iscene-phone-thumb"><svg viewBox={boxView(x)} aria-hidden="true"><rect x={hx + 10.5} y={119} width={3} height={1.4} rx={0.6} fill="#fff" /></svg></div>
    </FigureBox>
  );
}

function Gym({ width, stage }: { width: number; stage: number }) {
  const floor = 150;
  const mid = width / 2;
  return (
    <svg className="iscene-backdrop" viewBox={`0 ${SCENE_TOP} ${width} ${SCENE_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="iscene-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#034965" />
          <stop offset="1" stopColor="#0a3a57" />
        </linearGradient>
      </defs>
      <rect x={0} y={SCENE_TOP} width={width} height={floor - SCENE_TOP} fill="url(#iscene-wall)" />
      <rect x={width - 96} y={60} width={70} height={34} rx={3} fill="rgb(108 211 214 / 18%)" />
      <path d={`M${width - 61} 60 V94 M${width - 96} 77 H${width - 26}`} stroke="#0a3a57" strokeWidth={3} fill="none" />
      <rect x={0} y={floor} width={width} height={40} fill="#06283f" />
      <path d={`M0 162 H${width} M0 172 H${width}`} stroke="#0e4563" strokeWidth={1.5} />
      {stage >= 1 ? <rect x={width * 0.18} y={144} width={width * 0.78} height={8} rx={3} fill="#177c89" /> : null}
      {stage >= 2 ? (
        <g>
          <path d={`M${mid - 15} ${SCENE_TOP} H${mid + 15} V${SCENE_TOP + 30} L${mid} ${SCENE_TOP + 38} L${mid - 15} ${SCENE_TOP + 30} Z`} fill="#1b5fa8" stroke="#f0b85a" strokeWidth={1.6} strokeLinejoin="round" />
          <path d={`M${mid} ${SCENE_TOP + 7} L${mid + 4} ${SCENE_TOP + 18} L${mid} ${SCENE_TOP + 27} L${mid - 4} ${SCENE_TOP + 18} Z`} fill="#f0b85a" />
        </g>
      ) : null}
    </svg>
  );
}

/** The rented room's bulb, swaying on its wire (as in the gym). */
function Bulb({ width }: { width: number }) {
  const mid = width / 2;
  return (
    <FigureBox x={mid} className="iscene-bulb" style={{ "--by": SCENE_TOP } as CSSProperties}>
      <svg viewBox={`${mid - 50} ${SCENE_TOP} 100 100`} aria-hidden="true">
        <path d={`M${mid} ${SCENE_TOP} V${SCENE_TOP + 22}`} stroke="#3b5566" strokeWidth={1.4} />
        <circle cx={mid} cy={SCENE_TOP + 26} r={4} fill="#fbf1dc" />
        <polygon points={`${mid - 6},${SCENE_TOP + 28} ${mid + 6},${SCENE_TOP + 28} ${mid + 50},150 ${mid - 50},150`} fill="#fbf1dc" opacity={0.07} />
      </svg>
    </FigureBox>
  );
}

/** The panel's size (to draw the scene in its own units) and whether it is on screen. */
function useSceneBox() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 560, height: 150 });
  const [onScreen, setOnScreen] = useState(true);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    };
    measure();
    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    resize?.observe(element);
    const visible = typeof IntersectionObserver === "undefined"
      ? undefined
      : new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    visible?.observe(element);
    return () => {
      resize?.disconnect();
      visible?.disconnect();
    };
  }, []);
  return [ref, size, onScreen] as const;
}

type RoundPhase = "lead" | "out" | "back";

export const InstructorScene = memo(function InstructorScene({
  studentsInCourses,
  activeMembers,
  rarityCounts,
  coverage,
  hasInstructors,
  hasTechnician,
  children,
}: {
  studentsInCourses: number;
  activeMembers: number;
  rarityCounts: GymRarityCounts;
  coverage: readonly FormId[];
  hasInstructors: boolean;
  /** With at least one Tecnico in the school the tunic turns lilac. */
  hasTechnician: boolean;
  /** The data chips over the scene. */
  children?: ReactNode;
}) {
  const [ref, size, onScreen] = useSceneBox();
  const scale = size.height / SCENE_HEIGHT;
  const width = Math.max(200, (size.width / size.height) * SCENE_HEIGHT);
  const plan = useMemo(
    () => planInstructorScene({ width, studentsInCourses: hasInstructors ? studentsInCourses : 0, activeMembers, rarityCounts, coverage }),
    [activeMembers, coverage, hasInstructors, rarityCounts, studentsInCourses, width],
  );
  const tunic = hasTechnician ? TUNIC.technician : TUNIC.instructor;
  const teaching = plan.students.length > 0;
  // The round does not follow the courses (Andrea, 13/10): only the screen and «Riduci animazioni».
  const active = onScreen && !motionReduced();

  // Correction round (13/10): every 60–90 s the instructor walks between the rows and back.
  const [phase, setPhase] = useState<RoundPhase>("lead");
  const walkerRef = useRef<HTMLDivElement>(null);
  // Off screen or with «Riduci animazioni» the instructor is back at his spot.
  const shownPhase: RoundPhase = active ? phase : "lead";
  // The round follows the rows it saw when it started: the plan is rebuilt at every tick
  // (contacts, students), and restarting the walk on each one kept the instructor
  // walking in place by his spot (bug of 13/10).
  const [round, setRound] = useState(() => ({ spot: plan.spot, stops: plan.stops }));
  const planRef = useRef(plan);
  useLayoutEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    if (!active || phase !== "lead") return undefined;
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => {
        const current = planRef.current;
        // Nobody in the rows right now: the next round, not a restart of the countdown.
        if (current.stops.length === 0) {
          arm();
          return;
        }
        setRound({ spot: current.spot, stops: current.stops });
        setPhase("out");
      }, nextRoundDelayMs());
    };
    arm();
    return () => window.clearTimeout(timer);
  }, [active, phase]);
  // Layout effect: the walk back starts before the next paint, so the walker never flashes at its spot.
  useLayoutEffect(() => {
    const element = walkerRef.current;
    const { spot, stops } = round;
    if (shownPhase === "lead" || !element) return undefined;
    if (typeof element.animate !== "function" || stops.length === 0) {
      const timer = window.setTimeout(() => setPhase("lead"), 0);
      return () => window.clearTimeout(timer);
    }
    const px = (units: number) => `translateX(${((units - spot) * scale).toFixed(1)}px)`;
    const last = stops[stops.length - 1];
    let animation: Animation;
    if (shownPhase === "out") {
      const n = stops.length;
      const frames: Keyframe[] = [{ transform: px(spot), offset: 0, easing: "ease-in-out" }];
      stops.forEach((stop, index) => {
        frames.push({ transform: px(stop), offset: (index + 0.45) / n, easing: "ease-in-out" });
        frames.push({ transform: px(stop), offset: (index + 1) / n, easing: "ease-in-out" });
      });
      animation = element.animate(frames, { duration: n * ROUND_STOP_MS, fill: "forwards" });
      animation.onfinish = () => setPhase("back");
    } else {
      animation = element.animate([{ transform: px(last) }, { transform: px(spot) }], { duration: ROUND_BACK_MS, easing: "ease-in-out", fill: "forwards" });
      animation.onfinish = () => setPhase("lead");
    }
    return () => animation.cancel();
    // round changes only together with the start of a walk.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownPhase, scale]);

  const front = plan.students.filter((student) => !student.back);
  const back = plan.students.filter((student) => student.back);
  return (
    <div
      ref={ref}
      className={`iscene${onScreen ? "" : " is-offscreen"}${hasInstructors ? "" : " is-empty"}`}
      style={{ "--s": `${scale}px` } as CSSProperties}
      aria-hidden="true"
    >
      <Gym width={width} stage={plan.stage} />
      {plan.stage < 2 ? <Bulb width={width} /> : null}
      {back.map((student, index) => <Pupil key={`b${index}`} student={student} level={plan.level} />)}
      {hasInstructors && !teaching && shownPhase === "lead" ? <Scroller tunic={tunic} /> : null}
      {teaching && shownPhase === "lead" ? <Instructor x={plan.spot} tunic={tunic} level={plan.level} /> : null}
      {/* A round already started ends even if the courses empty the rows meanwhile. */}
      {shownPhase !== "lead" ? (
        <div ref={walkerRef} className="iscene-walker">
          <Walker x={round.spot} f={shownPhase === "out" ? 1 : -1} tunic={tunic} />
        </div>
      ) : null}
      {front.map((student, index) => <Pupil key={`f${index}`} student={student} level={plan.level} />)}
      {children}
    </div>
  );
});
