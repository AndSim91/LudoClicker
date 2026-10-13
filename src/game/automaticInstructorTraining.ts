import { getVisibleForms } from "../content/forms";
import { getInstructorSelfTrainingTier, isCourseXUnlocked } from "../content/upgrades";
import { startFormTraining } from "./trainingFlow";
import type { FormId, GameState } from "./types";

/**
 * The Forms an Istruttore takes on alone with «Istruttori in e-Learning», in
 * path order: L1 Forma 1, L2 Forma 2, L3 Corso Y. Never beyond Corso Y.
 * Never Corso X: its title comes from Forma 1 + Forma 2.
 */
export function getELearningForms(tier: number): FormId[] {
  const forms: FormId[] = [];
  if (tier >= 1) forms.push("form-1");
  // Corso X has no instructor course: Forma 1 + Forma 2 bring its title.
  if (tier >= 2) forms.push("form-2");
  if (tier >= 3) forms.push("course-y");
  return forms;
}

/**
 * «Istruttori in e-Learning»: every Istruttore takes the next instructor course
 * of the list on their own — the same course as the button in the Centro
 * didattico («Abilita» if they already know the Form, «Impara e abilita»
 * otherwise). Without funds, slots or swords nothing happens and it is tried
 * again at the next tick. The course is marked `eLearning`: see the hidden exam. Someone finishing lessons before changing sector is
 * left out.
 */
export function startELearningInstructorCourses(state: GameState, now: number): GameState {
  const tier = getInstructorSelfTrainingTier(state.upgrades);
  if (tier === 0 || !state.unlocks.forms) return state;
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const forms = getELearningForms(tier);
  const leaving = state.collaboratorManagement.automaticPendingMoves ?? {};
  // ponytail: retried every tick for each Istruttore with a course left; fine while they are few.
  return state.collaborators
    .filter((collaborator) =>
      collaborator.assignment === "instructor" &&
      !collaborator.training &&
      !(collaborator.id in leaving)
    )
    .reduce((current, collaborator) => {
      const teaches = getVisibleForms(collaborator.instructorForms, courseXUnlocked);
      const next = forms.find((formId) => !teaches.includes(formId));
      if (!next) return current;
      const started = startFormTraining(current, collaborator.id, next, now);
      // Marked so the exam knows: self-taught or e-Learning Istruttore phases take the malus.
      return started === current ? current : {
        ...started,
        collaborators: started.collaborators.map((candidate) =>
          candidate.id === collaborator.id && candidate.training
            ? { ...candidate, training: { ...candidate.training, eLearning: true } }
            : candidate
        ),
      };
    }, state);
}
