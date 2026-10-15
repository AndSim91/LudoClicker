import {
  getAvailableForms,
  getFormDefinition,
  getFormTrainingCount,
  hasOwnInstructorCourse,
  needsCourseXRecovery,
  type FormDefinition,
  type FormStudent,
} from "../../content/forms";
import {
  areAllFormBranchesUnlocked,
  getAnnualFormTrainingLimit,
  getInstructorBranchCapacityBonus,
  isCourseXUnlocked,
} from "../../content/upgrades";
import { getFormTrainingYear, isSummerBreak } from "../../game/calendar";
import type { Collaborator, FormTrainingStartMode, GameState } from "../../game/types";

export interface TrainingDefinitions {
  /** Forme già conosciute senza attestato: «Abilita». */
  qualification: FormDefinition[];
  /** Tutto quello che si può avviare adesso, abilitazioni comprese. */
  available: FormDefinition[];
  annualTrainingAvailable: boolean;
}

/**
 * What a person can start right now, the same list the Formazione column
 * shows. Lives here so the Centro didattico counter can't drift from it.
 */
export function getTrainingDefinitions(
  state: Pick<GameState, "school" | "upgrades">,
  student: FormStudent,
  collaborator: Collaborator | undefined,
  trainingMode: FormTrainingStartMode = "standard",
): TrainingDefinitions {
  const trainingYear = getFormTrainingYear(state.school.currentMonth);
  const annualTrainingLimit = getAnnualFormTrainingLimit(state.upgrades);
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const recoveryPending = courseXUnlocked && needsCourseXRecovery(student.forms);
  const annualTrainingAvailable = getFormTrainingCount(student, trainingYear) < annualTrainingLimit;
  const isInstructor = trainingMode === "standard" && collaborator?.assignment === "instructor";
  const summerBreak = isSummerBreak(state.school.currentMonth);
  if (summerBreak && !isInstructor) return { qualification: [], available: [], annualTrainingAvailable };

  // The Corso Istruttori has its own slot (13/10/2026): one at a time, beside the course as allievo.
  const qualification = isInstructor && !collaborator.instructorCourse
    ? collaborator.forms.flatMap((formId) => {
        const definition = getFormDefinition(formId);
        return definition && hasOwnInstructorCourse(formId) &&
            (courseXUnlocked || formId !== "course-x") &&
            !recoveryPending &&
            !collaborator.instructorForms.includes(formId)
          ? [definition]
          : [];
      })
    : [];
  const unrestrictedFormBranches = areAllFormBranchesUnlocked(state.upgrades);
  const branchCapacity = unrestrictedFormBranches
    ? 3
    : collaborator?.assignment === "instructor"
      ? Math.min(3, 1 + getInstructorBranchCapacityBonus(state.upgrades))
      : undefined;
  const learnedBranches = new Set(collaborator?.forms.flatMap((formId) => {
    const branch = getFormDefinition(formId)?.branch;
    return branch ? [branch] : [];
  }) ?? []);
  const newForms = annualTrainingAvailable
    ? getAvailableForms(
        student,
        trainingYear,
        branchCapacity,
        !unrestrictedFormBranches && collaborator?.assignment !== "instructor",
        annualTrainingLimit,
        courseXUnlocked,
      ).filter((definition) =>
        unrestrictedFormBranches ||
        !definition.branch ||
        learnedBranches.size > 0 ||
        !collaborator?.formBranchPreferences?.length ||
        collaborator.formBranchPreferences.includes(definition.branch)
      )
    : [];
  const available = summerBreak
    ? [...qualification, ...newForms.filter((definition) => hasOwnInstructorCourse(definition.id))]
    : [...qualification, ...newForms];
  return { qualification, available, annualTrainingAvailable };
}

/**
 * Forme per cui un Istruttore può fare il Corso Tecnici SIS: abilitato da
 * Istruttore, non ancora Tecnico. Usata dal controllo SIS e dal contatore della card.
 */
export function getTechnicianCourseDefinitions(
  collaborator: Collaborator,
  courseXUnlocked: boolean,
): FormDefinition[] {
  if (courseXUnlocked && needsCourseXRecovery(collaborator.forms)) return [];
  return collaborator.forms.flatMap((formId) => {
    const definition = getFormDefinition(formId);
    // Never Corso X: its Tecnico title comes from Forma 1 + Forma 2 (courseXTitles.ts).
    return definition &&
      hasOwnInstructorCourse(formId) &&
      collaborator.instructorForms.includes(formId) &&
      !(collaborator.technicianForms ?? []).includes(formId)
      ? [definition]
      : [];
  });
}
