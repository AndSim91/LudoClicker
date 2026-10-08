import { applyQualifyingCourseDiscount } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import type { FormId, GameState } from "./types";

/** The tutorial of Forme and Istruttori, at 10 members, only the first time ever (08/10/2026). */
export const FORMS_TEACHING_TUTORIAL_SCENE_ID = "forms-teaching" as const;

/**
 * While that tutorial runs, the first Forma 1 course as Istruttore is a scholarship
 * offered by Todaro: free, once, until a collaborator is (or is becoming) Istruttore.
 */
export function isTutorialInstructorScholarship(
  state: Pick<GameState, "unlocks" | "tutorial" | "collaborators" | "school">,
): boolean {
  const { completedSceneIds, skippedSceneIds } = state.tutorial;
  return state.unlocks.forms &&
    state.school.peakActiveMembers >= GAME_CONFIG.formsUnlockMembers &&
    !completedSceneIds.includes(FORMS_TEACHING_TUTORIAL_SCENE_ID) &&
    !skippedSceneIds.includes(FORMS_TEACHING_TUTORIAL_SCENE_ID) &&
    !state.collaborators.some((collaborator) =>
      collaborator.instructorForms.length > 0 ||
      Boolean(collaborator.training?.includesInstructorCertification)
    );
}

/** Price of a course that qualifies an Istruttore: discounted by the upgrades, free with the scholarship. */
export function getQualifyingCourseCost(
  state: Pick<GameState, "unlocks" | "tutorial" | "collaborators" | "upgrades" | "school">,
  baseCost: number,
  formId: FormId,
): number {
  if (formId === "form-1" && isTutorialInstructorScholarship(state)) return 0;
  return applyQualifyingCourseDiscount(state.upgrades, baseCost);
}
