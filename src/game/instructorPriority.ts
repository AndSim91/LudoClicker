import { isInstructorForm } from "../content/forms";
import type { GameState } from "./types";

export function getPriorityInstructorQualificationTechnicianIds(
  state: Pick<GameState, "collaborators">,
): Set<string> {
  const collaboratorsById = new Map(
    state.collaborators.map((collaborator) => [collaborator.id, collaborator]),
  );
  const priorityTechnicianIds = new Set<string>();

  for (const trainee of state.collaborators) {
    const training = trainee.training;
    if (
      !training?.technicianId ||
      !isInstructorForm(training.formId)
    ) continue;
    const technician = collaboratorsById.get(training.technicianId);
    if (technician?.assignment === "instructor") {
      priorityTechnicianIds.add(technician.id);
    }
  }

  return priorityTechnicianIds;
}
