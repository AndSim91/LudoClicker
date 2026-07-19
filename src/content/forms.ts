import type {
  Collaborator,
  CollaboratorAssignment,
  FormId,
  FormBranch,
  FormTraining,
  PersonRarity,
} from "../game/types";
import { PERSON_RARITIES } from "./rarities";
import { getCollaboratorMasteryMultiplier } from "./mastery";

export type { FormBranch } from "../game/types";

export interface FormStudent {
  forms: FormId[];
  rarity: PersonRarity;
  formBranchPreferences?: FormBranch[];
  training?: FormTraining;
  lastFormTrainingYear?: number;
  formTrainingYearCount?: number;
}

export interface FormDefinition {
  id: FormId;
  title: string;
  branch?: FormBranch;
  cost: number;
  durationMs: number;
  prerequisite?: FormId;
  anyPrerequisite?: FormId[];
  bonusLabel?: string;
}

export interface CollaboratorFormBonuses {
  writing: number;
  events: number;
  lessons: number;
  social: number;
  equipment: number;
  instructor: number;
  all: number;
}

export const FORM_DEFINITIONS: FormDefinition[] = [
  { id: "form-1", title: "Forma 1", cost: 25, durationMs: 20_000 },
  { id: "course-x", title: "Corso X", cost: 50, durationMs: 25_000, prerequisite: "form-1" },
  { id: "form-2", title: "Forma 2", cost: 100, durationMs: 30_000, prerequisite: "course-x" },
  { id: "course-y", title: "Corso Y", cost: 250, durationMs: 35_000, prerequisite: "form-2" },
  { id: "form-3-long", title: "Forma 3", branch: "Spada Lunga", cost: 600, durationMs: 40_000, prerequisite: "course-y", bonusLabel: "+15% Eventi" },
  { id: "form-4-long", title: "Forma 4", branch: "Spada Lunga", cost: 1_000, durationMs: 45_000, prerequisite: "form-3-long", bonusLabel: "+30% Eventi" },
  { id: "form-5-long", title: "Forma 5", branch: "Spada Lunga", cost: 1_500, durationMs: 50_000, prerequisite: "form-4-long", bonusLabel: "+50% Eventi" },
  { id: "form-3-staff", title: "Forma 3", branch: "Staffa", cost: 600, durationMs: 40_000, prerequisite: "course-y", bonusLabel: "+15% Lezioni" },
  { id: "form-4-staff", title: "Forma 4", branch: "Staffa", cost: 1_000, durationMs: 45_000, prerequisite: "form-3-staff", bonusLabel: "+30% Lezioni" },
  { id: "form-5-staff", title: "Forma 5", branch: "Staffa", cost: 1_500, durationMs: 50_000, prerequisite: "form-4-staff", bonusLabel: "+50% Lezioni" },
  { id: "form-3-double", title: "Forma 3", branch: "Doppia spada corta", cost: 600, durationMs: 40_000, prerequisite: "course-y", bonusLabel: "+10% Redazione e Social" },
  { id: "form-4-double", title: "Forma 4", branch: "Doppia spada corta", cost: 1_000, durationMs: 45_000, prerequisite: "form-3-double", bonusLabel: "+20% Redazione e Social" },
  { id: "form-5-double", title: "Forma 5", branch: "Doppia spada corta", cost: 1_500, durationMs: 50_000, prerequisite: "form-4-double", bonusLabel: "+35% Redazione e Social" },
  { id: "form-6", title: "Forma 6", cost: 2_200, durationMs: 60_000, anyPrerequisite: ["form-5-long", "form-5-staff", "form-5-double"], bonusLabel: "+10% su ogni incarico" },
  { id: "form-7", title: "Forma 7", cost: 3_000, durationMs: 75_000, prerequisite: "form-6", bonusLabel: "+20% su ogni incarico" },
];

export const FORM_BRANCHES: FormBranch[] = ["Spada Lunga", "Staffa", "Doppia spada corta"];

export const BRANCH_FORM_IDS: Record<FormBranch, FormId[]> = {
  "Spada Lunga": ["form-3-long", "form-4-long", "form-5-long"],
  Staffa: ["form-3-staff", "form-4-staff", "form-5-staff"],
  "Doppia spada corta": ["form-3-double", "form-4-double", "form-5-double"],
};

export function getFormDefinition(id: FormId) {
  return FORM_DEFINITIONS.find((definition) => definition.id === id);
}

export function isInstructorForm(formId: FormId): boolean {
  return FORM_DEFINITIONS.some((definition) => definition.id === formId);
}

export function getInstructorFormCost(cost: number): number {
  return Math.round(cost * 3 * 100) / 100;
}

export function getInstructorQualificationCost(cost: number): number {
  return Math.round(cost * 2 * 100) / 100;
}

export function getStudentFormCost(cost: number): number {
  return Math.round(cost * 0.25 * 100) / 100;
}

export function getMissingInstructorForms(collaborator: Collaborator): FormId[] {
  const certified = new Set(collaborator.instructorForms);
  const missing = collaborator.forms.filter((formId) =>
    isInstructorForm(formId) && !certified.has(formId),
  );
  const trainingFormId = collaborator.training?.formId;
  if (
    trainingFormId &&
    isInstructorForm(trainingFormId) &&
    !collaborator.training?.includesInstructorCertification &&
    !missing.includes(trainingFormId)
  ) {
    missing.push(trainingFormId);
  }
  return missing;
}

export function getInstructorConversionCost(collaborator: Collaborator): number {
  const cost = getMissingInstructorForms(collaborator).reduce(
    (total, formId) => total + getInstructorQualificationCost(getFormDefinition(formId)?.cost ?? 0),
    0,
  );
  return Math.round(cost * 100) / 100;
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
  maximumBranches = student.formBranchPreferences?.length ?? 1,
  restrictToPreferences = true,
  annualTrainingLimit = 1,
) {
  if (student.forms.includes(definition.id) || student.training) return false;
  if (
    typeof currentYear === "number" &&
    getFormTrainingCount(student, currentYear) >= annualTrainingLimit
  ) return false;
  if (definition.prerequisite && !student.forms.includes(definition.prerequisite)) return false;
  if (
    definition.anyPrerequisite &&
    !definition.anyPrerequisite.some((formId) => student.forms.includes(formId))
  ) return false;
  if (definition.branch) {
    if (
      restrictToPreferences &&
      student.formBranchPreferences?.length &&
      !student.formBranchPreferences.includes(definition.branch)
    ) return false;
    const learnedBranches = new Set(
      student.forms.flatMap((formId) => {
        const branch = getFormDefinition(formId)?.branch;
        return branch ? [branch] : [];
      }),
    );
    if (!learnedBranches.has(definition.branch) && learnedBranches.size >= maximumBranches) {
      return false;
    }
  }
  return true;
}

export function getAvailableForms(
  student: FormStudent,
  currentYear?: number,
  maximumBranches?: number,
  restrictToPreferences?: boolean,
  annualTrainingLimit?: number,
) {
  return FORM_DEFINITIONS.filter((definition) =>
    canTrainForm(
      student,
      definition,
      currentYear,
      maximumBranches,
      restrictToPreferences,
      annualTrainingLimit,
    )
  );
}

export function getFormTrainingCount(student: FormStudent, trainingYear: number): number {
  if (student.lastFormTrainingYear !== trainingYear) return 0;
  return Math.max(1, student.formTrainingYearCount ?? 1);
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
    instructor: 0,
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
  const masteryMultiplier = assignment
    ? getCollaboratorMasteryMultiplier(collaborator.mastery?.[assignment] ?? 0)
    : 1;
  return (
    (1 + bonuses.all + roleBonus) *
    PERSON_RARITIES[collaborator.rarity].collaboratorProductivityMultiplier *
    masteryMultiplier
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
