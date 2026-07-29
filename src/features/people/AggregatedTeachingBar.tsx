import { useMemo } from "react";
import { ProgressBar } from "../../components/common/ProgressBar";
import { AGONIST_COURSE_LOGO, getFormLogo } from "../../content/formLogos";
import {
  getFormDefinition,
  getTrainingCourseTitle,
  isAgonistCourse,
} from "../../content/forms";
import type { TrainingCourseId } from "../../game/types";
import { groupInstructorTeachingEntries } from "./aggregatedTeachingPresentation";
import {
  getAggregateInstructorProgress,
  getInstructorTrainingProgress,
  type InstructorTeachingEntry,
} from "./instructorGroupPresentation";

const MAX_DETAILED_TEACHING_COURSES = 24;

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
  emptyLabel = "Nessun corso in svolgimento",
}: {
  entries: readonly InstructorTeachingEntry[];
  now: number;
  agonistCourseUnlocked: boolean;
  variant?: "teaching" | "internal-instructor";
  emptyLabel?: string;
}) {
  const groups = useMemo(
    () => groupInstructorTeachingEntries(entries),
    [entries],
  );
  const internalInstructor = variant === "internal-instructor";

  return (
    <div
      className={`aggregated-teaching-groups${internalInstructor ? " is-internal-instructor" : ""}${groups.length === 0 ? " is-empty" : ""}`}
      aria-label={internalInstructor
        ? "Corsi Istruttori interni raggruppati per Forma"
        : "Lezioni raggruppate per Forma"}
    >
      {groups.length === 0 ? (
        <div className="aggregated-teaching-empty" role="status">
          <span aria-hidden="true" />
          <small>{emptyLabel}</small>
        </div>
      ) : null}
      {groups.map((group) => {
        const progress = getAggregateInstructorProgress(group.entries, now) ?? 0;
        const title = getTrainingCourseTitle(group.courseId, agonistCourseUnlocked);
        const courseCountLabel = `${group.entries.length} ${group.entries.length === 1 ? "corso" : "corsi"}`;
        const compact = group.entries.length > MAX_DETAILED_TEACHING_COURSES;
        const waitingCourseCount = compact
          ? group.entries.reduce(
              (count, entry) => count + Number(
                entry.training.status === "waitingForEquipment",
              ),
              0,
            )
          : 0;
        const waitingLabel = waitingCourseCount > 0
          ? ` · ${waitingCourseCount} in attesa di spade`
          : "";
        return (
          <div className="aggregated-teaching-group" key={group.courseId}>
            <span className="aggregated-teaching-course">
              <TeachingCourseLogo
                courseId={group.courseId}
                agonistCourseUnlocked={agonistCourseUnlocked}
              />
              <strong title={title}>{title}</strong>
            </span>
            {compact ? (
              <ProgressBar
                className={`aggregated-teaching-bar is-compact${waitingCourseCount === group.entries.length ? " is-waiting" : ""}`}
                label={`${title}: ${courseCountLabel}`}
                title={`${courseCountLabel} raggruppati · avanzamento medio ${Math.round(progress)}%${waitingLabel}`}
                value={progress}
                valueText={`${courseCountLabel} · avanzamento medio ${Math.round(progress)}%${waitingLabel}`}
              />
            ) : (
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
            )}
            <small>{group.entries.length}</small>
          </div>
        );
      })}
    </div>
  );
}
