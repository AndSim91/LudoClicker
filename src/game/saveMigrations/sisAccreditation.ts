import { createInitialUpgradeLevels } from "../../content/upgrades";
import type { MigratableState } from "./types";

function hasUsedSISTechnicianTraining(state: MigratableState): boolean {
  const collaboratorProgress = (state.collaborators ?? []).some((collaborator) =>
    (collaborator.technicianForms?.length ?? 0) > 0 ||
    Boolean(collaborator.technicianCourseReservation) ||
    collaborator.training?.trainingTrack === "technician"
  );
  const retainedProgress = Object.values(
    state.legendaryCollaborators?.retainedProgress ?? {},
  ).some((progress) => (progress?.technicianForms?.length ?? 0) > 0);
  return collaboratorProgress || retainedProgress;
}

export function migrateSISAccreditationState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 57) return state;

  const upgrades = {
    ...createInitialUpgradeLevels(),
    ...(state.upgrades ?? {}),
  };
  if (hasUsedSISTechnicianTraining(state)) {
    upgrades["sis-accreditation"] = 1;
  }

  return {
    ...state,
    version: 58,
    upgrades,
  };
}
