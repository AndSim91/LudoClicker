import {
  getAggregateInstructorProgress,
  getInstructorTrainingProgress,
  type InstructorTeachingEntry,
} from "./instructorGroupPresentation";

export function AggregatedTeachingBar({
  entries,
  now,
  label = "Avanzamento medio delle lezioni",
}: {
  entries: readonly InstructorTeachingEntry[];
  now: number;
  label?: string;
}) {
  const average = getAggregateInstructorProgress(entries, now) ?? 0;

  return (
    <span
      className="aggregated-teaching-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(average)}
      aria-valuetext={`${entries.length} ${entries.length === 1 ? "corso" : "corsi"}, ${Math.round(average)}% medio`}
    >
      {entries.length === 0 ? <span className="aggregated-teaching-empty" /> : entries.map((entry) => {
        const progress = getInstructorTrainingProgress(entry.training, now);
        const waiting = entry.training.status === "waitingForEquipment";
        return (
          <span
            className={`aggregated-teaching-segment${waiting ? " is-waiting" : ""}`}
            title={waiting
              ? `${entry.displayName}: in attesa di spade`
              : `${entry.displayName}: ${Math.round(progress)}%`}
            key={`${entry.id}-${entry.training.formId}-${entry.training.startedAt}`}
          >
            <span style={{ width: `${progress}%` }} />
          </span>
        );
      })}
    </span>
  );
}

