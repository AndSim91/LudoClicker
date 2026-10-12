import { useMemo } from "react";

import { isQuickTeacherTrainingUnlocked, isSISTechnicianCourseUnlocked } from "../../content/upgrades";
import { previewQuickTeacherTraining, type QuickTrainingPreview } from "../../game/quickTeacherTraining";
import type { GameState } from "../../game/types";

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
