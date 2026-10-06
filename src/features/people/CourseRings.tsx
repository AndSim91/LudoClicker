import type { CourseRing, FormActivity } from "./formActivity";

const SPAN = 75; // 270° out of 100: the arc stays open at the bottom, where the count goes.
const ROTATE = 135;
const STROKE = 2.4;
const ORDER: (keyof FormActivity)[] = ["students", "instructorCourse", "technicianCourse"];

/** Dashes only along the arc (2,5 / 2), then the rest of the circle empty. */
function dashedArc(): string {
  const dashes: number[] = [];
  let used = 0;
  while (used + 2.5 <= SPAN) {
    dashes.push(2.5);
    used += 2.5;
    if (used + 4.5 > SPAN) break;
    dashes.push(2);
    used += 2;
  }
  if (dashes.length % 2 === 0) dashes.pop();
  dashes.push(100 - dashes.reduce((total, dash) => total + dash, 0));
  return dashes.join(" ");
}

const DASHED = dashedArc();

/**
 * Concept K2 «Quadranti» (06/10): one 270° arc per course on the Form, from the
 * inside out azzurro (Allievi), verde (Corso Istruttori), viola (Corso Tecnici).
 * The arcs that are there shrink toward the logo. Still SVG, no animation.
 */
export function CourseRings({
  activity,
  size,
  radii,
  idleTrack = false,
}: {
  activity: FormActivity;
  size: number;
  radii: readonly number[];
  /** Corso Agonisti: the empty azzurro track stays when nobody follows it. */
  idleTrack?: boolean;
}) {
  const center = size / 2;
  const rings = ORDER.flatMap((key) => (activity[key] ? [[key, activity[key]] as const] : []));
  const arc = (ring: CourseRing) => ring.waiting
    ? { strokeDasharray: DASHED, strokeOpacity: 0.8 }
    : { strokeDasharray: `${(ring.progress * SPAN / 100).toFixed(1)} 100`, strokeLinecap: "round" as const };
  return (
    <svg className="course-rings" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {rings.slice(0, radii.length).map(([key, ring], level) => (
        <g key={key} className={`course-ring is-${key}`} transform={`rotate(${ROTATE} ${center} ${center})`}>
          <circle cx={center} cy={center} r={radii[level]} strokeWidth={STROKE} pathLength={100} strokeDasharray={`${SPAN} 100`} className="course-ring-track" />
          <circle cx={center} cy={center} r={radii[level]} strokeWidth={STROKE} pathLength={100} {...arc(ring)} />
        </g>
      ))}
      {idleTrack && rings.length === 0 ? (
        <g className="course-ring is-students" transform={`rotate(${ROTATE} ${center} ${center})`}>
          <circle cx={center} cy={center} r={radii[0]} strokeWidth={STROKE} pathLength={100} strokeDasharray={`${SPAN} 100`} className="course-ring-track" />
        </g>
      ) : null}
    </svg>
  );
}
