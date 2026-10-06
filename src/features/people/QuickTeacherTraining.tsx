import { useMemo } from "react";
import { Icon } from "../../components/common/Icon";
import { getFormDefinition } from "../../content/forms";
import { isQuickTeacherTrainingUnlocked, isSISTechnicianCourseUnlocked } from "../../content/upgrades";
import { getGameMonthName } from "../../game/calendar";
import {
  previewQuickTeacherTraining,
  type QuickTrainingKind,
  type QuickTrainingPreview,
} from "../../game/quickTeacherTraining";
import { getNextSISStartMonth } from "../../game/teacherTrainingFlow";
import type { GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";

export interface QuickTrainingPreviews {
  enabled: boolean;
  technicianEnabled: boolean;
  instructor?: QuickTrainingPreview;
  technician?: QuickTrainingPreview;
}

/** Ufficio formazione: cosa farebbero i due pulsanti adesso (Forma e costo). */
export function useQuickTrainingPreviews(state: GameState, now: number): QuickTrainingPreviews {
  return useMemo(() => {
    const enabled = isQuickTeacherTrainingUnlocked(state.upgrades);
    const technicianEnabled = enabled && isSISTechnicianCourseUnlocked(state.upgrades);
    return {
      enabled,
      technicianEnabled,
      instructor: enabled ? previewQuickTeacherTraining(state, "instructor", now) : undefined,
      technician: technicianEnabled ? previewQuickTeacherTraining(state, "technician", now) : undefined,
    };
  }, [state, now]);
}

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
  onStart: (kind: QuickTrainingKind) => void;
}) {
  if (!previews.enabled) return null;
  return (
    <div className="instructor-quick-training" role="group" aria-label="Ufficio formazione">
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
  );
}
