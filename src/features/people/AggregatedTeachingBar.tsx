import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AGONIST_COURSE_LOGO, getFormLogo } from "../../content/formLogos";
import {
  getFormDefinition,
  getTrainingCourseTitle,
  isAgonistCourse,
} from "../../content/forms";
import type { TrainingCourseId } from "../../game/types";
import { groupInstructorTeachingEntries } from "./aggregatedTeachingPresentation";
import { useGameTimeSource } from "../../game/GameTimeContext";
import { motionReduced } from "../../shared/motion";
import {
  getAggregateInstructorProgress,
  getInstructorTrainingProgress,
  type InstructorTeachingEntry,
} from "./instructorGroupPresentation";

/** From this many courses of one Forma, one looping bar replaces the segments (Andrea, concept A). */
export const LAP_BAR_MIN_COURSES = 8;

/** Late-game courses can last a second: the lap never runs faster than this. */
const MIN_LAP_MS = 4_000;

/**
 * The most common length among the running courses, in whole seconds (athletes
 * and Istruttori in training can differ a lot), never under MIN_LAP_MS.
 */
function getLapGameDurationMs(entries: readonly InstructorTeachingEntry[]): number {
  const counts = new Map<number, number>();
  let common = 0;
  for (const { training } of entries) {
    if (training.status === "waitingForEquipment") continue;
    const seconds = Math.round((training.completesAt - training.startedAt) / 1_000);
    if (seconds <= 0) continue;
    const count = (counts.get(seconds) ?? 0) + 1;
    counts.set(seconds, count);
    if (count > (counts.get(common) ?? 0) || (count === counts.get(common) && seconds > common)) {
      common = seconds;
    }
  }
  return Math.max(MIN_LAP_MS, common * 1_000);
}

/**
 * «Un giro per Forma»: the bar loops with the course length, drawn by the
 * browser alone, so it stays smooth however often the game updates. The count
 * is who follows the course now; each lap shows how many graduated meanwhile.
 * Outlook and «Riduci animazioni»: a still bar and the same numbers.
 */
function LapTeachingBar({
  entries,
  now,
  title,
}: {
  entries: readonly InstructorTeachingEntry[];
  now: number;
  title: string;
}) {
  const timeSource = useGameTimeSource();
  const paused = timeSource?.isPaused ?? false;
  const speed = Math.max(0.01, timeSource?.speed ?? 1);
  const lapMs = getLapGameDurationMs(entries) / speed;
  const animated = !motionReduced() && document.documentElement.dataset.theme !== "light";
  const previousRef = useRef(new Map<string, number>());
  const graduatesRef = useRef(0);
  const [lastLap, setLastLap] = useState({ lap: 0, graduates: 0 });

  // A course that leaves the group on time is a graduate (a second of slack for the UI clock).
  useEffect(() => {
    // Keyed by person: one group is one Forma, and nobody takes the same Forma twice.
    const current = new Map(entries.map((entry) => [entry.id, entry.training.completesAt]));
    for (const [key, completesAt] of previousRef.current) {
      if (!current.has(key) && completesAt <= now + 1_000) graduatesRef.current += 1;
    }
    previousRef.current = current;
  }, [entries, now]);

  const closeLap = () => {
    const graduates = graduatesRef.current;
    graduatesRef.current = 0;
    setLastLap((current) => ({ lap: current.lap + 1, graduates }));
  };

  // Still modes have no animation to follow: a timer closes the lap.
  useEffect(() => {
    if (animated || paused) return undefined;
    const id = window.setInterval(closeLap, lapMs);
    return () => window.clearInterval(id);
  }, [animated, paused, lapMs]);

  const allWaiting = entries.every((entry) => entry.training.status === "waitingForEquipment");
  const people = `${entries.length} allievi`;
  const graduatesText = `${lastLap.graduates} ${lastLap.graduates === 1 ? "diplomato" : "diplomati"} nell'ultimo giro`;
  return (
    <>
      <span
        className={`aggregated-teaching-bar is-compact is-lap${allWaiting ? " is-waiting" : ""}${paused ? " is-paused" : ""}`}
        role="progressbar"
        aria-label={`${title}: ${people}`}
        aria-valuetext={lastLap.lap > 0 ? `${people} · ${graduatesText}` : people}
        title={lastLap.lap > 0 ? `${people} · ${graduatesText}` : people}
      >
        {allWaiting ? null : (
          <span
            style={{ "--lap-duration": `${Math.round(lapMs)}ms` } as CSSProperties}
            onAnimationIteration={closeLap}
          />
        )}
      </span>
      <small className="aggregated-teaching-lap-count">
        {people}
        {animated && lastLap.graduates > 0 ? (
          <span className="aggregated-teaching-graduates" key={lastLap.lap} aria-hidden="true">
            +{lastLap.graduates} {lastLap.graduates === 1 ? "diplomato" : "diplomati"}
          </span>
        ) : null}
      </small>
      {!animated && lastLap.lap > 0 ? (
        <small className="aggregated-teaching-lap-note">{graduatesText}</small>
      ) : null}
    </>
  );
}

function TeachingCourseLogo({
  courseId,
  agonistCourseUnlocked,
}: {
  courseId: TrainingCourseId;
  agonistCourseUnlocked: boolean;
}) {
  const title = getTrainingCourseTitle(courseId, agonistCourseUnlocked);
  if (isAgonistCourse(courseId)) {
    return (
      <span className="aggregated-teaching-course-logo" title={title}>
        <img
          src={AGONIST_COURSE_LOGO.assetPath}
          alt={`${title} — emblema generato`}
        />
        {agonistCourseUnlocked ? (
          <span className="agonist-course-star" aria-hidden="true">★</span>
        ) : null}
      </span>
    );
  }

  const logo = getFormLogo(courseId);
  const definition = getFormDefinition(courseId);
  return (
    <span className="aggregated-teaching-course-logo" title={definition?.longName ?? title}>
      <img
        src={logo.assetPath}
        alt={`${definition?.longName ?? title} — emblema ${logo.source === "official" ? "ufficiale" : "generato"}`}
      />
    </span>
  );
}

export function AggregatedTeachingBar({
  entries,
  now,
  agonistCourseUnlocked,
  variant = "teaching",
}: {
  entries: readonly InstructorTeachingEntry[];
  now: number;
  agonistCourseUnlocked: boolean;
  variant?: "teaching" | "internal-instructor" | "technician";
}) {
  const groups = useMemo(
    () => groupInstructorTeachingEntries(entries),
    [entries],
  );
  const internalInstructor = variant === "internal-instructor";
  const technician = variant === "technician";

  if (groups.length === 0) return null;

  return (
    <div
      className={`aggregated-teaching-groups${internalInstructor ? " is-internal-instructor" : ""}${technician ? " is-technician" : ""}`}
      aria-label={internalInstructor
        ? "Corsi Istruttori raggruppati per Forma"
        : technician
          ? "Corsi Tecnici raggruppati per Forma"
        : "Lezioni raggruppate per Forma"}
    >
      {groups.map((group) => {
        const progress = getAggregateInstructorProgress(group.entries, now) ?? 0;
        const title = getTrainingCourseTitle(group.courseId, agonistCourseUnlocked);
        const courseCountLabel = `${group.entries.length} ${group.entries.length === 1 ? "corso" : "corsi"}`;
        if (group.entries.length >= LAP_BAR_MIN_COURSES) {
          return (
            <div className="aggregated-teaching-group" key={group.courseId}>
              <span className="aggregated-teaching-course">
                <TeachingCourseLogo
                  courseId={group.courseId}
                  agonistCourseUnlocked={agonistCourseUnlocked}
                />
                <strong title={title}>{title}</strong>
              </span>
              <LapTeachingBar entries={group.entries} now={now} title={title} />
            </div>
          );
        }
        return (
          <div className="aggregated-teaching-group" key={group.courseId}>
            <span className="aggregated-teaching-course">
              <TeachingCourseLogo
                courseId={group.courseId}
                agonistCourseUnlocked={agonistCourseUnlocked}
              />
              <strong title={title}>{title}</strong>
            </span>
            <span
              className="aggregated-teaching-bar"
              role="progressbar"
              aria-label={`${title}: ${courseCountLabel}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-valuetext={`${courseCountLabel} · ${Math.round(progress)}%`}
            >
              {group.entries.map((entry) => {
                const entryProgress = getInstructorTrainingProgress(entry.training, now);
                const waiting = entry.training.status === "waitingForEquipment";
                return (
                  <span
                    className={`aggregated-teaching-segment${waiting ? " is-waiting" : ""}`}
                    title={waiting
                      ? `${entry.displayName}: in attesa di spade`
                      : `${entry.displayName}: ${Math.round(entryProgress)}%`}
                    key={`${entry.id}-${entry.training.startedAt}`}
                  >
                    <span style={{ width: `${entryProgress}%` }} />
                  </span>
                );
              })}
            </span>
            <small>{courseCountLabel}</small>
          </div>
        );
      })}
    </div>
  );
}
