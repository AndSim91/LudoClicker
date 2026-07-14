import type {
  Collaborator,
  CollaboratorAssignment,
  FormId,
  FormTraining,
  PersonRarity,
} from "../game/types";
import { PERSON_RARITIES } from "./rarities";

export type FormBranch = "Spada Lunga" | "Staffa" | "Doppia spada corta";

export interface FormStudent {
  forms: FormId[];
  rarity: PersonRarity;
  training?: FormTraining;
  lastFormTrainingYear?: number;
}

export interface FormDefinition {
  id: FormId;
  title: string;
  branch?: FormBranch;
  cost: number;
  durationMs: number;
  prerequisite?: FormId;
  anyPrerequisite?: FormId[];
  legendaryOnly?: boolean;
  bonusLabel?: string;
}

export interface CollaboratorFormBonuses {
  writing: number;
  events: number;
  lessons: number;
  social: number;
  equipment: number;
  all: number;
}

export const FORM_DEFINITIONS: FormDefinition[] = [
  { id: "form-1", title: "Forma 1", cost: 15, durationMs: 20_000 },
  { id: "course-x", title: "Corso X", cost: 20, durationMs: 25_000, prerequisite: "form-1" },
  { id: "form-2", title: "Forma 2", cost: 25, durationMs: 30_000, prerequisite: "course-x" },
  { id: "course-y", title: "Corso Y", cost: 30, durationMs: 35_000, prerequisite: "form-2" },
  { id: "form-3-long", title: "Forma 3", branch: "Spada Lunga", cost: 40, durationMs: 40_000, prerequisite: "course-y", bonusLabel: "+15% Eventi" },
  { id: "form-4-long", title: "Forma 4", branch: "Spada Lunga", cost: 50, durationMs: 45_000, prerequisite: "form-3-long", bonusLabel: "+30% Eventi" },
  { id: "form-5-long", title: "Forma 5", branch: "Spada Lunga", cost: 60, durationMs: 50_000, prerequisite: "form-4-long", bonusLabel: "+50% Eventi" },
  { id: "form-3-staff", title: "Forma 3", branch: "Staffa", cost: 40, durationMs: 40_000, prerequisite: "course-y", bonusLabel: "+15% Lezioni" },
  { id: "form-4-staff", title: "Forma 4", branch: "Staffa", cost: 50, durationMs: 45_000, prerequisite: "form-3-staff", bonusLabel: "+30% Lezioni" },
  { id: "form-5-staff", title: "Forma 5", branch: "Staffa", cost: 60, durationMs: 50_000, prerequisite: "form-4-staff", bonusLabel: "+50% Lezioni" },
  { id: "form-3-double", title: "Forma 3", branch: "Doppia spada corta", cost: 40, durationMs: 40_000, prerequisite: "course-y", bonusLabel: "+10% Redazione e Social" },
  { id: "form-4-double", title: "Forma 4", branch: "Doppia spada corta", cost: 50, durationMs: 45_000, prerequisite: "form-3-double", bonusLabel: "+20% Redazione e Social" },
  { id: "form-5-double", title: "Forma 5", branch: "Doppia spada corta", cost: 60, durationMs: 50_000, prerequisite: "form-4-double", bonusLabel: "+35% Redazione e Social" },
  { id: "form-6", title: "Forma 6", cost: 75, durationMs: 60_000, anyPrerequisite: ["form-5-long", "form-5-staff", "form-5-double"], legendaryOnly: true, bonusLabel: "+10% su ogni incarico" },
  { id: "form-7", title: "Forma 7", cost: 100, durationMs: 75_000, prerequisite: "form-6", legendaryOnly: true, bonusLabel: "+20% su ogni incarico" },
];

const BRANCH_FORM_IDS: Record<FormBranch, FormId[]> = {
  "Spada Lunga": ["form-3-long", "form-4-long", "form-5-long"],
  Staffa: ["form-3-staff", "form-4-staff", "form-5-staff"],
  "Doppia spada corta": ["form-3-double", "form-4-double", "form-5-double"],
};

export function getFormDefinition(id: FormId) {
  return FORM_DEFINITIONS.find((definition) => definition.id === id);
}

export function getChosenFormBranch(forms: FormId[]): FormBranch | undefined {
  return (Object.entries(BRANCH_FORM_IDS) as Array<[FormBranch, FormId[]]>).find(([, ids]) =>
    ids.some((id) => forms.includes(id)),
  )?.[0];
}

export function canTrainForm(
  student: FormStudent,
  definition: FormDefinition,
  currentYear?: number,
) {
  if (student.forms.includes(definition.id) || student.training) return false;
  if (
    typeof currentYear === "number" &&
    student.lastFormTrainingYear === currentYear
  ) return false;
  if (definition.legendaryOnly && student.rarity !== "legendary") return false;
  if (definition.prerequisite && !student.forms.includes(definition.prerequisite)) return false;
  if (
    definition.anyPrerequisite &&
    !definition.anyPrerequisite.some((formId) => student.forms.includes(formId))
  ) return false;
  const chosenBranch = getChosenFormBranch(student.forms);
  if (definition.branch && chosenBranch && definition.branch !== chosenBranch) return false;
  return true;
}

export function getAvailableForms(student: FormStudent, currentYear?: number) {
  return FORM_DEFINITIONS.filter((definition) => canTrainForm(student, definition, currentYear));
}

function latestBranchBonus(forms: FormId[], branch: FormBranch): number {
  const completed = BRANCH_FORM_IDS[branch];
  const values = branch === "Doppia spada corta" ? [0.1, 0.2, 0.35] : [0.15, 0.3, 0.5];
  return completed.reduce(
    (bonus, formId, index) => forms.includes(formId) ? values[index] : bonus,
    0,
  );
}

export function getCollaboratorFormBonuses(collaborator: Collaborator): CollaboratorFormBonuses {
  const bonuses: CollaboratorFormBonuses = {
    writing: 0,
    events: 0,
    lessons: 0,
    social: 0,
    equipment: 0,
    all: collaborator.forms.includes("form-7")
      ? 0.2
      : collaborator.forms.includes("form-6")
        ? 0.1
        : 0,
  };
  bonuses.events = latestBranchBonus(collaborator.forms, "Spada Lunga");
  bonuses.lessons = latestBranchBonus(collaborator.forms, "Staffa");
  const doubleBonus = latestBranchBonus(collaborator.forms, "Doppia spada corta");
  bonuses.writing = doubleBonus;
  bonuses.social = doubleBonus;
  return bonuses;
}

export function getCollaboratorProductivity(
  collaborator: Collaborator,
  assignment: CollaboratorAssignment = collaborator.assignment,
) {
  const bonuses = getCollaboratorFormBonuses(collaborator);
  const roleBonus = assignment ? bonuses[assignment] : 0;
  return (
    (1 + bonuses.all + roleBonus) *
    PERSON_RARITIES[collaborator.rarity].collaboratorProductivityMultiplier
  );
}

export function getCollaboratorBonusSummary(collaborator: Collaborator): string {
  const bonuses = getCollaboratorFormBonuses(collaborator);
  const entries = [
    bonuses.events > 0 ? `Eventi +${Math.round(bonuses.events * 100)}%` : "",
    bonuses.lessons > 0 ? `Lezioni +${Math.round(bonuses.lessons * 100)}%` : "",
    bonuses.writing > 0 ? `Redazione e Social +${Math.round(bonuses.writing * 100)}%` : "",
    bonuses.all > 0 ? `Tutti gli incarichi +${Math.round(bonuses.all * 100)}%` : "",
  ].filter(Boolean);
  return entries.join(" · ");
}
