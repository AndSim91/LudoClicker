import type { Collaborator, FormId } from "../game/types";

export interface FormDefinition {
  id: FormId;
  title: string;
  branch?: "Spada Lunga" | "Staffa" | "Doppia spada corta";
  cost: number;
  durationMs: number;
  prerequisite?: FormId;
  anyPrerequisite?: FormId[];
}

export const FORM_DEFINITIONS: FormDefinition[] = [
  { id: "form-1", title: "Forma 1", cost: 15, durationMs: 20_000 },
  { id: "course-x", title: "Corso X", cost: 20, durationMs: 25_000, prerequisite: "form-1" },
  { id: "form-2", title: "Forma 2", cost: 25, durationMs: 30_000, prerequisite: "course-x" },
  { id: "course-y", title: "Corso Y", cost: 30, durationMs: 35_000, prerequisite: "form-2" },
  { id: "form-3-long", title: "Forma 3", branch: "Spada Lunga", cost: 40, durationMs: 40_000, prerequisite: "course-y" },
  { id: "form-4-long", title: "Forma 4", branch: "Spada Lunga", cost: 50, durationMs: 45_000, prerequisite: "form-3-long" },
  { id: "form-5-long", title: "Forma 5", branch: "Spada Lunga", cost: 60, durationMs: 50_000, prerequisite: "form-4-long" },
  { id: "form-3-staff", title: "Forma 3", branch: "Staffa", cost: 40, durationMs: 40_000, prerequisite: "course-y" },
  { id: "form-4-staff", title: "Forma 4", branch: "Staffa", cost: 50, durationMs: 45_000, prerequisite: "form-3-staff" },
  { id: "form-5-staff", title: "Forma 5", branch: "Staffa", cost: 60, durationMs: 50_000, prerequisite: "form-4-staff" },
  { id: "form-3-double", title: "Forma 3", branch: "Doppia spada corta", cost: 40, durationMs: 40_000, prerequisite: "course-y" },
  { id: "form-4-double", title: "Forma 4", branch: "Doppia spada corta", cost: 50, durationMs: 45_000, prerequisite: "form-3-double" },
  { id: "form-5-double", title: "Forma 5", branch: "Doppia spada corta", cost: 60, durationMs: 50_000, prerequisite: "form-4-double" },
  { id: "form-6", title: "Forma 6", cost: 75, durationMs: 60_000, anyPrerequisite: ["form-5-long", "form-5-staff", "form-5-double"] },
  { id: "form-7", title: "Forma 7", cost: 100, durationMs: 75_000, prerequisite: "form-6" },
];

export function getFormDefinition(id: FormId) {
  return FORM_DEFINITIONS.find((definition) => definition.id === id);
}

export function canTrainForm(collaborator: Collaborator, definition: FormDefinition) {
  if (collaborator.forms.includes(definition.id) || collaborator.training) return false;
  if (definition.prerequisite && !collaborator.forms.includes(definition.prerequisite)) return false;
  if (
    definition.anyPrerequisite &&
    !definition.anyPrerequisite.some((formId) => collaborator.forms.includes(formId))
  ) return false;
  return true;
}

export function getAvailableForms(collaborator: Collaborator) {
  return FORM_DEFINITIONS.filter((definition) => canTrainForm(collaborator, definition));
}

export function getCollaboratorProductivity(collaborator: Collaborator) {
  return 1 + collaborator.forms.length * 0.05;
}
