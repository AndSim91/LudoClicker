import { useMemo } from "react";
import { AggregatedTeachingBar } from "./AggregatedTeachingBar";
import type { InternalInstructorCourseEntry } from "./instructorGroupPresentation";

export function InternalInstructorCourseList({
  entries,
  now,
}: {
  entries: readonly InternalInstructorCourseEntry[];
  now: number;
}) {
  const progressEntries = useMemo(
    () => entries.map((entry) => ({
      id: entry.trainee.id,
      displayName: `${entry.trainee.displayName} · con il Tecnico ${entry.technician.displayName}`,
      instructorId: entry.technician.id,
      training: entry.training,
    })),
    [entries],
  );

  return (
    <AggregatedTeachingBar
      entries={progressEntries}
      now={now}
      agonistCourseUnlocked={false}
      variant="internal-instructor"
      emptyLabel="Nessun Corso Istruttori in svolgimento"
    />
  );
}
