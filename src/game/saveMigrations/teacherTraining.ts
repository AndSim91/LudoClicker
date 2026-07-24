import type { MigratableState } from "./types";

function migrateTraining<Training extends {
  formId: string;
  includesInstructorCertification?: boolean;
  trainingTrack?: string;
  trainingPhase?: string;
}>(training: Training | undefined): Training | undefined {
  if (!training || training.trainingTrack) return training;
  if (training.formId === "agonist-course") {
    return {
      ...training,
      trainingTrack: "agonist",
      trainingPhase: "agonist",
    };
  }
  return {
    ...training,
    trainingTrack: training.includesInstructorCertification
      ? "combined-instructor"
      : "athlete",
    trainingPhase: "athlete",
  };
}

export function migrateTeacherTrainingState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 55) return state;

  const collaborators = (state.collaborators ?? []).map((collaborator) => ({
    ...collaborator,
    technicianForms: [...(collaborator.technicianForms ?? [])],
    training: migrateTraining(collaborator.training),
  }));
  const contacts = (state.contacts ?? []).map((contact) => ({
    ...contact,
    training: migrateTraining(contact.training),
  }));
  const retainedProgress = Object.fromEntries(
    Object.entries(state.legendaryCollaborators?.retainedProgress ?? {}).map(
      ([profileId, progress]) => [
        profileId,
        progress
          ? { ...progress, technicianForms: [...(progress.technicianForms ?? [])] }
          : progress,
      ],
    ),
  );

  return {
    ...state,
    version: 56,
    contacts,
    collaborators,
    legendaryCollaborators: state.legendaryCollaborators
      ? { ...state.legendaryCollaborators, retainedProgress }
      : state.legendaryCollaborators,
  };
}
