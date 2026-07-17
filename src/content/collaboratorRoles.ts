import type { CollaboratorMasteryRole } from "../game/types";

export const COLLABORATOR_ASSIGNMENT_LABELS: Record<CollaboratorMasteryRole, string> = {
  writing: "Redazione",
  events: "Eventi",
  lessons: "Lezioni in palestra",
  social: "Social",
  equipment: "Attrezzatura",
  instructor: "Istruttore",
};

export const AUTOMATION_ASSIGNMENTS: readonly CollaboratorMasteryRole[] = [
  "writing",
  "events",
  "lessons",
  "social",
  "equipment",
];
