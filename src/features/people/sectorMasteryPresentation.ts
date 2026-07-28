import {
  createInitialCollaboratorMastery,
  getCollaboratorMasteryProgress,
} from "../../content/mastery";
import type { Collaborator, CollaboratorMasteryRole } from "../../game/types";

export function getAverageSectorMastery(
  collaborators: readonly Collaborator[],
  role: CollaboratorMasteryRole,
) {
  if (collaborators.length === 0) {
    return {
      averageXp: 0,
      progress: getCollaboratorMasteryProgress(0),
    };
  }

  const averageXp = collaborators.reduce((total, collaborator) => {
    const mastery = collaborator.mastery ?? createInitialCollaboratorMastery();
    return total + (mastery[role] ?? 0);
  }, 0) / collaborators.length;

  return {
    averageXp,
    progress: getCollaboratorMasteryProgress(averageXp),
  };
}
