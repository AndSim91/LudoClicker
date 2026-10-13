import { getTrainingSlot } from "../trainingSlots";
import type { FormTraining } from "../types";
import type { MigratableState } from "./types";

/*
 * v112 (13/10/2026): corsi in parallelo (Andrea). A Corso Istruttori or Corso Tecnici
 * in progress moves from `training` to its own slot, so the course as allievo is free.
 */
export function migrateParallelCoursesState(state: MigratableState): MigratableState {
  if (state.version !== 111) return state;
  return {
    ...state,
    version: 112,
    collaborators: state.collaborators?.map((collaborator) => {
      const training = collaborator.training as FormTraining | undefined;
      if (!training) return collaborator;
      const slot = getTrainingSlot(training);
      if (slot === "training") return collaborator;
      const moved = { ...collaborator, [slot]: training };
      delete moved.training;
      return moved;
    }),
  };
}
