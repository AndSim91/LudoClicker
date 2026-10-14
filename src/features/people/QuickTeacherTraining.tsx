import { Icon } from "../../components/common/Icon";
import { getFormDefinition } from "../../content/forms";
import { getGameMonthName } from "../../game/calendar";
import type { QuickTrainingKind, QuickTrainingPreview, QuickTrainingRequest } from "../../game/quickTeacherTraining";
import { getNextSISStartMonth } from "../../game/teacherTrainingFlow";
import type { QuickTrainingPreviews } from "./useQuickTrainingPreviews";
import { formatCurrency } from "../../shared/formatters";

function QuickButton({
  kind,
  preview,
  course,
  onStart,
}: {
  kind: QuickTrainingKind;
  preview?: QuickTrainingPreview;
  course: string;
  onStart: (kind: QuickTrainingKind) => void;
}) {
  const action = kind === "instructor" ? "Forma un Istruttore" : "Forma un Tecnico";
  const formName = preview ? getFormDefinition(preview.formId)?.longName ?? preview.formId : undefined;
  const detail = !preview
    ? "Nessuno può aprire una Forma nuova"
    : preview.affordable
      ? `${course} · ${formatCurrency(preview.cost)}`
      : `Servono ${formatCurrency(preview.cost)}`;
  return (
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
  );
}

export function QuickTeacherTraining({
  previews,
  currentMonth,
  onStart,
}: {
  previews: QuickTrainingPreviews;
  currentMonth: number;
  onStart: (kind: QuickTrainingRequest) => void;
}) {
  if (!previews.enabled) return null;
  const { started, cost } = previews.max;
  const maxDetail = started === 0
    ? "nessun corso da avviare"
    : `avvia ${started} ${started === 1 ? "corso" : "corsi"} · ${formatCurrency(cost)}`;
  return (
    <div className="instructor-quick-office" role="group" aria-label="Ufficio formazione">
      <div className="instructor-quick-training">
        <QuickButton kind="instructor" preview={previews.instructor} course="Corso Istruttori" onStart={onStart} />
        {previews.technicianEnabled ? (
          <QuickButton
            kind="technician"
            preview={previews.technician}
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
      {/* «Max» (Andrea, 14/10): tutti i corsi che si possono pagare, sulle Forme più scoperte. */}
      <button
        type="button"
        className="instructor-quick-max"
        disabled={started === 0}
        title={maxDetail}
        aria-label={`Max · ${maxDetail}`}
        onClick={() => onStart("all")}
      >
        <strong>Max</strong>
        <span>{started === 0 ? "—" : `${started} ${started === 1 ? "corso" : "corsi"}`}</span>
      </button>
    </div>
  );
}
