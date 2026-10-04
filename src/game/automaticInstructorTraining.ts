import { getVisibleForms } from "../content/forms";
import { isCourseXUnlocked } from "../content/upgrades";
import { startFormTraining } from "./trainingFlow";
import type { GameState } from "./types";

/**
 * «Assegnazione automatica» (4.7): an Istruttore who cannot teach any Form
 * starts Forma 1 as an instructor — the same course as the button in the
 * Centro didattico («Abilita» if they already know it, «Impara e abilita»
 * otherwise; a colleague may teach it first). Without funds nothing happens
 * and it is tried again at the next tick, so it starts as soon as the money
 * is there. Someone finishing lessons before changing sector is left out.
 */
export function startFormOneForUnqualifiedInstructors(state: GameState, now: number): GameState {
  if (!state.collaboratorManagement.automaticShares || !state.unlocks.forms) return state;
  const leaving = state.collaboratorManagement.automaticPendingMoves ?? {};
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  // ponytail: retried every tick for each such Istruttore; fine while they are few.
  return state.collaborators
    .filter((collaborator) =>
      collaborator.assignment === "instructor" &&
      !collaborator.training &&
      !(collaborator.id in leaving) &&
      getVisibleForms(collaborator.instructorForms, courseXUnlocked).length === 0
    )
    .reduce((current, collaborator) => startFormTraining(current, collaborator.id, "form-1", now), state);
}
