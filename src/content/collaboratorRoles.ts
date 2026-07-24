import type { CollaboratorMasteryRole } from "../game/types";

export const COLLABORATOR_ASSIGNMENT_LABELS: Record<CollaboratorMasteryRole, string> = {
  writing: "Redazione",
  events: "Eventi",
  equipment: "Attrezzatura",
  instructor: "Istruttore",
};

export function getCollaboratorAssignmentLabel(
  assignment: CollaboratorMasteryRole,
  socialUnlocked: boolean,
): string {
  return assignment === "writing" && socialUnlocked
    ? "Social"
    : COLLABORATOR_ASSIGNMENT_LABELS[assignment];
}

export const AUTOMATION_ASSIGNMENTS: readonly CollaboratorMasteryRole[] = [
  "writing",
  "events",
  "equipment",
];
