import { Icon } from "../../components/common/Icon";
import { getFormDefinition } from "../../content/forms";
import { getGameMonthName } from "../../game/calendar";
import type { QuickTrainingKind, QuickTrainingPreview } from "../../game/quickTeacherTraining";
import { getNextSISStartMonth } from "../../game/teacherTrainingFlow";
import type { QuickTrainingMax, QuickTrainingPreviews } from "./useQuickTrainingPreviews";
import { formatCurrency } from "../../shared/formatters";

type StartQuickTraining = (kind: QuickTrainingKind, max?: boolean) => void;

function QuickButton({
  kind,
  preview,
  max,
  course,
  onStart,
}: {
  kind: QuickTrainingKind;
  preview?: QuickTrainingPreview;
  max: QuickTrainingMax;
  course: string;
  onStart: StartQuickTraining;
}) {
  const action = kind === "instructor" ? "Forma un Istruttore" : "Forma un Tecnico";
  const formName = preview ? getFormDefinition(preview.formId)?.longName ?? preview.formId : undefined;
  const detail = !preview
    ? "Nessuno può aprire una Forma nuova"
    : preview.affordable
      ? `${course} · ${formatCurrency(preview.cost)}`
      : `Servono ${formatCurrency(preview.cost)}`;
  const maxLabel = max.started === 0
    ? "Max · nessun corso pagabile adesso"
    : `Max · avvia ${max.started} ${max.started === 1 ? "corso" : "corsi"} · ${formatCurrency(max.cost)}`;
  return (
    // «Max» dentro il riquadro, a destra (Andrea, 14/10): due pulsanti fratelli, perché un pulsante dentro l'altro non è HTML valido.
    <div className={`instructor-quick-item${kind === "technician" ? " is-technician" : ""}`}>
      <button
        type="button"
        className={kind === "technician" ? "is-technician" : undefined}
        disabled={!preview?.affordable}
        onClick={() => onStart(kind)}
      >
        <span className="instructor-quick-main">
          {kind === "instructor"
            ? <Icon name="people" />
            : <span className="technician-course-badge" aria-hidden="true">SIS</span>}
          {formName ? `${action} · ${formName}` : action}
        </span>
        <span className="instructor-quick-detail"><span className="sr-only"> · </span>{detail}</span>
      </button>
      <button
        type="button"
        className="instructor-quick-max"
        disabled={max.started === 0}
        title={maxLabel}
        aria-label={maxLabel}
        onClick={() => onStart(kind, true)}
      >
        <strong>Max</strong>
        <span>{max.started}</span>
      </button>
    </div>
  );
}

export function QuickTeacherTraining({
  previews,
  currentMonth,
  onStart,
}: {
  previews: QuickTrainingPreviews;
  currentMonth: number;
  onStart: StartQuickTraining;
}) {
  if (!previews.enabled) return null;
  return (
    <div className="instructor-quick-training" role="group" aria-label="Ufficio formazione">
      <QuickButton
        kind="instructor"
        preview={previews.instructor}
        max={previews.instructorMax}
        course="Corso Istruttori"
        onStart={onStart}
      />
      {previews.technicianEnabled ? (
        <QuickButton
          kind="technician"
          preview={previews.technician}
          max={previews.technicianMax}
          course={`Corso Tecnici SIS da ${getGameMonthName(getNextSISStartMonth(currentMonth)).toLowerCase()}`}
          onStart={onStart}
        />
      ) : (
        // Altezza fissa (06/10): il secondo posto c'è già, in attesa della SIS.
        <div className="instructor-quick-slot" aria-hidden="true">
          <strong>Forma un Tecnico</strong>
          <span>Con la SIS, dagli Upgrade</span>
        </div>
      )}
    </div>
  );
}
