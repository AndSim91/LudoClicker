import type {
  Collaborator,
  CollaboratorAssignment,
  FormId,
  FormBranch,
  FormTraining,
  PersonRarity,
  TrainingCourseId,
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
  longName: string;
  shortName: string;
  branch?: FormBranch;
  cost: number;
  durationMs: number;
  prerequisite?: FormId;
  anyPrerequisite?: FormId[];
  bonusLabel?: string;
  requiredSwords: number;
  loadPerSword: number;
}

export interface CollaboratorFormBonuses {
  writing: number;
  events: number;
  equipment: number;
  instructor: number;
  all: number;
}

export const FORM_DEFINITIONS: FormDefinition[] = [
  { id: "form-1", longName: "Forma 1", shortName: "F1", cost: 50, durationMs: 20_000, requiredSwords: 1, loadPerSword: 10 },
  { id: "course-x", longName: "Corso X", shortName: "CX", cost: 100, durationMs: 25_000, prerequisite: "form-1", requiredSwords: 1, loadPerSword: 10 },
  { id: "form-2", longName: "Forma 2", shortName: "F2", cost: 250, durationMs: 30_000, prerequisite: "course-x", requiredSwords: 1, loadPerSword: 10 },
  { id: "course-y", longName: "Corso Y", shortName: "CY", cost: 500, durationMs: 35_000, prerequisite: "form-2", requiredSwords: 2, loadPerSword: 10 },
  { id: "form-3-long", longName: "Forma 3 Spada Lunga", shortName: "F3L", branch: "Spada Lunga", cost: 1_000, durationMs: 40_000, prerequisite: "course-y", bonusLabel: "+15% Eventi", requiredSwords: 1, loadPerSword: 10 },
  { id: "form-4-long", longName: "Forma 4 Spada Lunga", shortName: "F4L", branch: "Spada Lunga", cost: 1_500, durationMs: 45_000, prerequisite: "form-3-long", bonusLabel: "+30% Eventi", requiredSwords: 1, loadPerSword: 10 },
  { id: "form-5-long", longName: "Forma 5 Spada Lunga", shortName: "F5L", branch: "Spada Lunga", cost: 2_000, durationMs: 50_000, prerequisite: "form-4-long", bonusLabel: "+50% Eventi", requiredSwords: 1, loadPerSword: 32 },
  { id: "form-3-staff", longName: "Forma 3 Staffa", shortName: "F3S", branch: "Staffa", cost: 1_000, durationMs: 40_000, prerequisite: "course-y", bonusLabel: "+15% Preparazione atletica istruttori", requiredSwords: 2, loadPerSword: 10 },
  { id: "form-4-staff", longName: "Forma 4 Staffa", shortName: "F4S", branch: "Staffa", cost: 1_500, durationMs: 45_000, prerequisite: "form-3-staff", bonusLabel: "+30% Preparazione atletica istruttori", requiredSwords: 2, loadPerSword: 10 },
  { id: "form-5-staff", longName: "Forma 5 Staffa", shortName: "F5S", branch: "Staffa", cost: 2_000, durationMs: 50_000, prerequisite: "form-4-staff", bonusLabel: "+50% Preparazione atletica istruttori", requiredSwords: 2, loadPerSword: 32 },
  { id: "form-3-double", longName: "Forma 3 Doppie Spade Corte", shortName: "F3D", branch: "Doppia spada corta", cost: 1_000, durationMs: 40_000, prerequisite: "course-y", bonusLabel: "+10% Redazione e Social", requiredSwords: 2, loadPerSword: 10 },
  { id: "form-4-double", longName: "Forma 4 Doppie Spade Corte", shortName: "F4D", branch: "Doppia spada corta", cost: 1_500, durationMs: 45_000, prerequisite: "form-3-double", bonusLabel: "+20% Redazione e Social", requiredSwords: 2, loadPerSword: 10 },
  { id: "form-5-double", longName: "Forma 5 Doppie Spade Corte", shortName: "F5D", branch: "Doppia spada corta", cost: 2_000, durationMs: 50_000, prerequisite: "form-4-double", bonusLabel: "+35% Redazione e Social", requiredSwords: 2, loadPerSword: 32 },
  { id: "form-6", longName: "Forma 6", shortName: "F6", cost: 3_000, durationMs: 60_000, anyPrerequisite: ["form-5-long", "form-5-staff", "form-5-double"], bonusLabel: "+10% su ogni incarico", requiredSwords: 2, loadPerSword: 20 },
  { id: "form-7", longName: "Forma 7", shortName: "F7", cost: 5_000, durationMs: 75_000, prerequisite: "form-6", bonusLabel: "+20% su ogni incarico", requiredSwords: 3, loadPerSword: 20 },
];

export function getAgonistCourseRequiredSwords(forms: FormId[]): number {
  if (forms.includes("form-7")) return 3;
  if (
    forms.includes("form-6") ||
    forms.some((formId) => formId.includes("-staff") || formId.includes("-double")) ||
    forms.includes("course-y")
  ) return 2;
  return 1;
}

const FORM_IDS = new Set<FormId>(FORM_DEFINITIONS.map((definition) => definition.id));

export function isUniqueFormIdList(value: unknown): value is FormId[] {
  if (!Array.isArray(value)) return false;
  const seen = new Set<FormId>();
  for (const entry of value) {
    if (typeof entry !== "string" || !FORM_IDS.has(entry as FormId) || seen.has(entry as FormId)) {
      return false;
    }
    seen.add(entry as FormId);
  }
  return true;
}

export const FORM_BRANCHES: FormBranch[] = ["Spada Lunga", "Staffa", "Doppia spada corta"];

export const BRANCH_FORM_IDS: Record<FormBranch, FormId[]> = {
  "Spada Lunga": ["form-3-long", "form-4-long", "form-5-long"],
  Staffa: ["form-3-staff", "form-4-staff", "form-5-staff"],
  "Doppia spada corta": ["form-3-double", "form-4-double", "form-5-double"],
};

export function getFormDefinition(id: FormId) {
  return FORM_DEFINITIONS.find((definition) => definition.id === id);
}

export const AGONIST_COURSE_ID = "agonist-course" as const;

export function isAgonistCourse(id: TrainingCourseId): id is typeof AGONIST_COURSE_ID {
  return id === AGONIST_COURSE_ID;
}

export function getTrainingCourseTitle(
  id: TrainingCourseId,
  technicalArenaLevel = 3,
  agonistCourseGrantsStats?: boolean,
): string {
  if (!isAgonistCourse(id)) return getFormDefinition(id)?.longName ?? "Formazione";
  const grantsStats = agonistCourseGrantsStats ?? technicalArenaLevel >= 3;
  return grantsStats ? "Corso Agonisti" : "Arena Tecnica";
}

export function isInstructorForm(formId: TrainingCourseId): formId is FormId {
  if (isAgonistCourse(formId)) return false;
  return FORM_DEFINITIONS.some((definition) => definition.id === formId);
}

export function getInstructorFormCost(cost: number): number {
  return Math.round(cost * 3.5 * 100) / 100;
}

export function getInstructorQualificationCost(cost: number): number {
  return Math.round(cost * 2.5 * 100) / 100;
}

export function getInternalInstructorQualificationCost(cost: number): number {
  return Math.round(getInstructorQualificationCost(cost) * 0.75 * 100) / 100;
}

export function getTechnicianCourseCost(cost: number): number {
  return Math.round(cost * 10 * 100) / 100;
}

export function getInstructorQualificationDuration(durationMs: number): number {
  return Math.round(durationMs * 0.75);
}

export function getInstructorFormDuration(durationMs: number): number {
  return durationMs + getInstructorQualificationDuration(durationMs);
}

export function getTechnicianCourseDuration(durationMs: number): number {
  return Math.round(durationMs * 10);
}

export function getStudentFormCost(cost: number): number {
  return Math.round(cost * 0.75 * 100) / 100;
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
    !collaborator.instructorForms.includes(trainingFormId) &&
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
    equipment: 0,
    instructor: 0,
    all: collaborator.forms.includes("form-7")
      ? 0.2
      : collaborator.forms.includes("form-6")
        ? 0.1
        : 0,
  };
  bonuses.events = latestBranchBonus(collaborator.forms, "Spada Lunga");
  const doubleBonus = latestBranchBonus(collaborator.forms, "Doppia spada corta");
  bonuses.writing = doubleBonus;
  return bonuses;
}

/**
 * La Preparazione atletica è un compito di riserva degli Istruttori. I bonus
 * delle Forme contano soltanto quando il collaboratore possiede anche il
 * relativo attestato da istruttore.
 */
export function getInstructorAthleticPreparationProductivity(
  collaborator: Collaborator,
): number {
  const certifiedForms = collaborator.instructorForms;
  const staffBonus = latestBranchBonus(certifiedForms, "Staffa");
  const allBonus = certifiedForms.includes("form-7")
    ? 0.2
    : certifiedForms.includes("form-6")
      ? 0.1
      : 0;
  const masteryMultiplier = getCollaboratorMasteryMultiplier(
    collaborator.mastery?.instructor ?? 0,
  );
  return (
    (1 + staffBonus + allBonus) *
    PERSON_RARITIES[collaborator.rarity].collaboratorProductivityMultiplier *
    masteryMultiplier
  );
}

export function getCollaboratorBaseProductivity(
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

export function getCollaboratorProductivity(
  collaborator: Collaborator,
  assignment: CollaboratorAssignment = collaborator.assignment,
) {
  const masteryMultiplier = assignment
    ? getCollaboratorMasteryMultiplier(collaborator.mastery?.[assignment] ?? 0)
    : 1;
  return getCollaboratorBaseProductivity(collaborator, assignment) * masteryMultiplier;
}

export function getCollaboratorBonusSummary(collaborator: Collaborator): string {
  const bonuses = getCollaboratorFormBonuses(collaborator);
  const entries = [
    bonuses.events > 0 ? `Eventi +${Math.round(bonuses.events * 100)}%` : "",
    latestBranchBonus(collaborator.instructorForms, "Staffa") > 0
      ? `Preparazione atletica +${Math.round(
          latestBranchBonus(collaborator.instructorForms, "Staffa") * 100,
        )}%`
      : "",
    bonuses.writing > 0 ? `Redazione e Social +${Math.round(bonuses.writing * 100)}%` : "",
    bonuses.all > 0 ? `Tutti gli incarichi +${Math.round(bonuses.all * 100)}%` : "",
  ].filter(Boolean);
  return entries.join(" · ");
}
