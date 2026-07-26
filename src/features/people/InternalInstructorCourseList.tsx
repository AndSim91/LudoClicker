import { useMemo } from "react";
import { ProgressBar } from "../../components/common/ProgressBar";
import { getFormDefinition } from "../../content/forms";
import {
  getInstructorTrainingProgress,
  groupInternalInstructorCourseEntries,
  type InternalInstructorCourseEntry,
} from "./instructorGroupPresentation";
import { FormLogoStrip } from "./PersonPresentation";

const MAX_DETAILED_INTERNAL_COURSES = 24;

function InternalInstructorCourseRow({
  entry,
  now,
}: {
  entry: InternalInstructorCourseEntry;
  now: number;
}) {
  const progress = getInstructorTrainingProgress(entry.training, now);
  const formName = getFormDefinition(entry.formId)?.longName ?? entry.formId;
  return (
    <div className="internal-instructor-course">
      <FormLogoStrip
        className="sector-form-strip"
        forms={[entry.formId]}
        instructorForms={[entry.formId]}
        showLabels={false}
      />
      <span>
        <strong>{formName} · {entry.trainee.displayName}</strong>
        <small>con il Tecnico {entry.technician.displayName}</small>
      </span>
      <ProgressBar
        className="internal-instructor-course-progress"
        label={`Corso Istruttori interno di ${entry.trainee.displayName}`}
        value={progress}
        durationMs={entry.training.completesAt - entry.training.startedAt}
      />
      <strong>{Math.round(progress)}%</strong>
    </div>
  );
}

export function InternalInstructorCourseList({
  entries,
  now,
}: {
  entries: readonly InternalInstructorCourseEntry[];
  now: number;
}) {
  const groups = useMemo(
    () => groupInternalInstructorCourseEntries(entries),
    [entries],
  );

  return (
    <div className="internal-instructor-course-list">
      {groups.map((group) => {
        if (group.entries.length === 1) {
          const entry = group.entries[0];
          return (
            <InternalInstructorCourseRow
              entry={entry}
              key={`${entry.trainee.id}-${entry.training.startedAt}`}
              now={now}
            />
          );
        }

        const formName = getFormDefinition(group.formId)?.longName ?? group.formId;
        const progressByEntry = group.entries.map((entry) => ({
          entry,
          progress: getInstructorTrainingProgress(entry.training, now),
        }));
        const progress = progressByEntry.reduce(
          (total, item) => total + item.progress,
          0,
        ) / progressByEntry.length;
        const roundedProgress = Math.round(progress);
        const technicianCount = new Set(
          group.entries.map((entry) => entry.technician.id),
        ).size;
        const courseCountLabel = `${group.entries.length} corsi`;
        const technicianCountLabel = `${technicianCount} ${technicianCount === 1 ? "Tecnico" : "Tecnici"}`;
        const progressLabel = `Corsi Istruttori interni di ${formName}: ${courseCountLabel}`;
        const progressValueText = `${courseCountLabel} · avanzamento medio ${roundedProgress}%`;
        const compact = group.entries.length > MAX_DETAILED_INTERNAL_COURSES;

        return (
          <div className="internal-instructor-course is-grouped" key={group.formId}>
            <FormLogoStrip
              className="sector-form-strip"
              forms={[group.formId]}
              instructorForms={[group.formId]}
              showLabels={false}
            />
            <span>
              <strong>{formName} · {courseCountLabel}</strong>
              <small>{group.entries.length} istruttori con {technicianCountLabel}</small>
            </span>
            {compact ? (
              <ProgressBar
                className="internal-instructor-course-progress is-grouped"
                label={progressLabel}
                title={progressValueText}
                value={progress}
                valueText={progressValueText}
              />
            ) : (
              <span
                className="internal-instructor-course-progress is-segmented"
                role="progressbar"
                aria-label={progressLabel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={roundedProgress}
                aria-valuetext={progressValueText}
              >
                {progressByEntry.map(({ entry, progress: entryProgress }) => (
                  <span
                    className="internal-instructor-course-segment"
                    title={`${entry.trainee.displayName} · con il Tecnico ${entry.technician.displayName}: ${Math.round(entryProgress)}%`}
                    key={`${entry.trainee.id}-${entry.training.startedAt}`}
                  >
                    <span style={{ width: `${entryProgress}%` }} />
                  </span>
                ))}
              </span>
            )}
            <strong title="Avanzamento medio">{roundedProgress}%</strong>
          </div>
        );
      })}
    </div>
  );
}
