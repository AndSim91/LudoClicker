import { useMemo } from "react";

import { isQuickTeacherTrainingUnlocked, isSISTechnicianCourseUnlocked } from "../../content/upgrades";
import {
  previewQuickTeacherTraining,
  startAllQuickTeacherTrainings,
  type QuickTrainingPreview,
} from "../../game/quickTeacherTraining";
import type { GameState } from "../../game/types";

export interface QuickTrainingMax {
  started: number;
  cost: number;
}

const NO_MAX: QuickTrainingMax = { started: 0, cost: 0 };

export interface QuickTrainingPreviews {
  enabled: boolean;
  technicianEnabled: boolean;
  instructor?: QuickTrainingPreview;
  technician?: QuickTrainingPreview;
  /** «Max» di ogni pulsante: quanti corsi partirebbero adesso, con i Fondi veri, e quanto costano. */
  instructorMax: QuickTrainingMax;
  technicianMax: QuickTrainingMax;
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
      // ponytail: simula tutti i corsi a ogni render; se pesa con molti Istruttori, ricalcolare solo all'hover.
      instructorMax: enabled ? startAllQuickTeacherTrainings(state, "instructor", now) : NO_MAX,
      technicianMax: technicianEnabled ? startAllQuickTeacherTrainings(state, "technician", now) : NO_MAX,
    };
  }, [state, now]);
}
