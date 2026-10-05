import { getCollaboratorMasteryLevel } from "../content/mastery";
import { getFormDefinition } from "../content/forms";
import { isCourseXUnlocked, isQuickTeacherTrainingUnlocked, isSISTechnicianCourseUnlocked } from "../content/upgrades";
import { getAthleteTournamentStats } from "./athleteStats";
import { getInstructorPendingReleaseIds } from "./collaboratorManagement";
import { bookTechnicianCourse } from "./teacherTrainingFlow";
import { startFormTraining } from "./trainingFlow";
import type { Collaborator, FormId, GameState } from "./types";

export type QuickTrainingKind = "instructor" | "technician";

/** A parità di copertura, l'ordine scelto da Andrea. */
export const QUICK_TRAINING_FORM_ORDER: readonly FormId[] = [
  "form-1", "form-2", "course-x", "course-y",
  "form-3-long", "form-3-staff", "form-3-double",
  "form-4-long", "form-4-staff", "form-4-double",
  "form-5-long", "form-5-staff", "form-5-double",
  "form-6", "form-7",
];

/** Chi copre già la Forma, contando anche chi ci sta arrivando (così due clic non finiscono sulla stessa). */
function covers(collaborator: Collaborator, formId: FormId, kind: QuickTrainingKind): boolean {
  if (kind === "instructor") {
    return collaborator.instructorForms.includes(formId) || collaborator.training?.formId === formId;
  }
  return (collaborator.technicianForms ?? []).includes(formId) ||
    collaborator.technicianCourseReservation?.formId === formId ||
    (collaborator.training?.formId === formId &&
      (collaborator.training.trainingPhase === "technician" || collaborator.training.trainingTrack === "technician"));
}

/** Può aprire quella Forma: la sa già, oppure è la prossima del suo percorso. */
function canReach(collaborator: Collaborator, formId: FormId, kind: QuickTrainingKind, courseXUnlocked: boolean): boolean {
  if (kind === "technician") {
    return collaborator.instructorForms.includes(formId) && !collaborator.technicianCourseReservation;
  }
  if (collaborator.training) return false;
  if (collaborator.forms.includes(formId)) return true;
  const definition = getFormDefinition(formId);
  if (!definition) return false;
  if (definition.anyPrerequisite) return definition.anyPrerequisite.some((id) => collaborator.forms.includes(id));
  // Senza Corso X la Forma 2 segue direttamente la Forma 1.
  const prerequisite = definition.prerequisite === "course-x" && !courseXUnlocked ? "form-1" : definition.prerequisite;
  return !prerequisite || collaborator.forms.includes(prerequisite);
}

/**
 * «Ufficio formazione»: un clic avvia un corso Istruttori (o prenota un corso
 * Tecnici SIS) sulla Forma che ha meno Istruttori (o Tecnici), a parità
 * nell'ordine di QUICK_TRAINING_FORM_ORDER. Lo fa chi ha la Maestria da
 * Istruttore più alta, a parità lo Stile più alto. Tutte le regole del corso
 * restano quelle del pulsante del Centro didattico: se nessuno può, non succede nulla.
 */
export function startQuickTeacherTraining(
  state: GameState,
  kind: QuickTrainingKind,
  now: number,
): GameState {
  if (!state.unlocks.forms || !isQuickTeacherTrainingUnlocked(state.upgrades)) return state;
  if (kind === "technician" && !isSISTechnicianCourseUnlocked(state.upgrades)) return state;
  const leaving = getInstructorPendingReleaseIds(state);
  const instructors = state.collaborators.filter(
    (collaborator) => collaborator.assignment === "instructor" && !leaving.has(collaborator.id),
  );
  const contacts = new Map(state.contacts.map((contact) => [contact.id, contact]));
  const style = (collaborator: Collaborator) => {
    const contact = contacts.get(collaborator.contactId);
    return contact ? getAthleteTournamentStats(contact, collaborator.forms).style : 0;
  };
  const ranked = instructors
    .map((collaborator) => ({
      collaborator,
      level: getCollaboratorMasteryLevel(collaborator.mastery?.instructor),
      style: style(collaborator),
    }))
    .sort((a, b) => b.level - a.level || b.style - a.style)
    .map((entry) => entry.collaborator);
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const forms = QUICK_TRAINING_FORM_ORDER
    .filter((formId) => courseXUnlocked || formId !== "course-x")
    .map((formId) => ({ formId, count: instructors.filter((c) => covers(c, formId, kind)).length }))
    .sort((a, b) => a.count - b.count); // stabile: a parità resta l'ordine di Andrea

  // ponytail: prova forma × persona finché un corso parte; al clic, non a ogni tick, quindi va bene anche con centinaia di Istruttori.
  for (const { formId } of forms) {
    for (const collaborator of ranked) {
      if (covers(collaborator, formId, kind) || !canReach(collaborator, formId, kind, courseXUnlocked)) continue;
      const next = kind === "instructor"
        ? startFormTraining(state, collaborator.id, formId, now)
        : bookTechnicianCourse(state, collaborator.id, formId, now);
      if (next !== state) return next;
    }
  }
  return state;
}
