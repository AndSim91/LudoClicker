import {
  getFormDefinition,
  getInstructorQualificationCost,
} from "../../content/forms";
import type { FormId, GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import type { AvailableInstructorCourse } from "./instructorGroupPresentation";
import { TrainingFormPreview } from "./PersonPresentation";

export function InstructorCourseShortcut({
  course,
  state,
  onStartTraining,
}: {
  course: AvailableInstructorCourse;
  state: GameState;
  onStartTraining: (personId: string, formId: FormId) => void;
}) {
  const definition = getFormDefinition(course.formId);
  if (!definition) return null;

  const cost = getInstructorQualificationCost(definition.cost);
  const trainingInProgress = Boolean(course.instructor.training);
  const lacksFunds = state.school.euros < cost;
  const actionLabel = trainingInProgress
    ? "Formazione in corso"
    : lacksFunds
      ? `Servono ${formatCurrency(cost)}`
      : cost === 0
        ? "Avvia Corso Istruttori"
        : `Avvia Corso Istruttori · ${formatCurrency(cost)}`;

  return (
    <div className="instructor-course-shortcut">
      <small>Corso Istruttori disponibile</small>
      <strong>{course.instructor.displayName}</strong>
      <TrainingFormPreview definition={definition} />
      <button
        type="button"
        disabled={trainingInProgress || lacksFunds}
        onClick={() => onStartTraining(course.instructor.id, course.formId)}
      >
        {actionLabel}
      </button>
    </div>
  );
}
