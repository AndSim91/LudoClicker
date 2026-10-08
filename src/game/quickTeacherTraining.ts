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

/**
 * Copertura didattica: per ogni Forma quanti Istruttori (o Tecnici) ci sono,
 * contando anche chi ha il corso in corso o il Corso Tecnici SIS prenotato.
 * È lo stesso conto con cui l'Ufficio formazione sceglie la Forma.
 */
export function countTeacherCoverage(
  collaborators: readonly Collaborator[],
  kind: QuickTrainingKind,
): Map<FormId, number> {
  const counts = new Map<FormId, number>();
  for (const formId of QUICK_TRAINING_FORM_ORDER) {
    const count = collaborators.filter((collaborator) => covers(collaborator, formId, kind)).length;
    if (count > 0) counts.set(formId, count);
  }
  return counts;
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
  return pickQuickTeacherTraining(state, kind, now).state;
}

export interface QuickTrainingPreview {
  formId: FormId;
  cost: number;
  affordable: boolean;
}

// Fondi finti per l'anteprima: così si vede la Forma scelta (e il suo costo) anche quando mancano i soldi.
const PREVIEW_FUNDS = 1e15;

/** Cosa farebbe il prossimo clic: Forma e costo. Undefined se nessuno può aprire una Forma. */
export function previewQuickTeacherTraining(
  state: GameState,
  kind: QuickTrainingKind,
  now: number,
): QuickTrainingPreview | undefined {
  // Anche spade in abbondanza: senza, il corso resterebbe «in attesa di spade» e non mostrerebbe il costo.
  const rich: GameState = {
    ...state,
    school: { ...state.school, euros: PREVIEW_FUNDS },
    equipment: { ...state.equipment, totalSwords: state.equipment.totalSwords + 1_000, availableSwords: state.equipment.availableSwords + 1_000 },
  };
  const picked = pickQuickTeacherTraining(rich, kind, now);
  if (!picked.formId) return undefined;
  const cost = Math.round((PREVIEW_FUNDS - picked.state.school.euros) * 100) / 100;
  return { formId: picked.formId, cost, affordable: state.school.euros >= cost };
}

/** Instructors who can take a course, best first: Maestria da Istruttore, then Stile. */
function rankTrainingInstructors(state: GameState): Collaborator[] {
  const leaving = getInstructorPendingReleaseIds(state);
  const instructors = state.collaborators.filter(
    (collaborator) => collaborator.assignment === "instructor" && !leaving.has(collaborator.id),
  );
  const contactIds = new Set(instructors.map((collaborator) => collaborator.contactId));
  const contacts = new Map(
    state.contacts.filter((contact) => contactIds.has(contact.id)).map((contact) => [contact.id, contact]),
  );
  const style = (collaborator: Collaborator) => {
    const contact = contacts.get(collaborator.contactId);
    return contact ? getAthleteTournamentStats(contact, collaborator.forms).style : 0;
  };
  return instructors
    .map((collaborator) => ({
      collaborator,
      level: getCollaboratorMasteryLevel(collaborator.mastery?.instructor),
      style: style(collaborator),
    }))
    .sort((a, b) => b.level - a.level || b.style - a.style)
    .map((entry) => entry.collaborator);
}

/** Starts the course for one collaborator; the state is unchanged if a rule refuses it. */
export function startTeacherCourse(
  state: GameState,
  collaboratorId: string,
  formId: FormId,
  kind: QuickTrainingKind,
  now: number,
): GameState {
  return kind === "instructor"
    ? startFormTraining(state, collaboratorId, formId, now)
    : bookTechnicianCourse(state, collaboratorId, formId, now);
}

/** Who could take the Istruttori (or Tecnici) course on this Forma, best first (Pianificazione delle Onde). */
export function getTeacherCourseCandidates(
  state: GameState,
  formId: FormId,
  kind: QuickTrainingKind,
): Collaborator[] {
  if (!state.unlocks.forms) return [];
  if (kind === "technician" && !isSISTechnicianCourseUnlocked(state.upgrades)) return [];
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  if (formId === "course-x" && !courseXUnlocked) return [];
  return rankTrainingInstructors(state).filter((collaborator) =>
    !covers(collaborator, formId, kind) && canReach(collaborator, formId, kind, courseXUnlocked));
}

function pickQuickTeacherTraining(
  state: GameState,
  kind: QuickTrainingKind,
  now: number,
): { state: GameState; formId?: FormId } {
  const none = { state };
  if (!state.unlocks.forms || !isQuickTeacherTrainingUnlocked(state.upgrades)) return none;
  if (kind === "technician" && !isSISTechnicianCourseUnlocked(state.upgrades)) return none;
  const ranked = rankTrainingInstructors(state);
  const courseXUnlocked = isCourseXUnlocked(state.upgrades);
  const coverage = countTeacherCoverage(ranked, kind);
  const forms = QUICK_TRAINING_FORM_ORDER
    .filter((formId) => courseXUnlocked || formId !== "course-x")
    .map((formId) => ({ formId, count: coverage.get(formId) ?? 0 }))
    .sort((a, b) => a.count - b.count); // stabile: a parità resta l'ordine di Andrea

  // ponytail: prova forma × persona finché un corso parte. L'anteprima lo rifà a ogni render con fondi finti, quindi si ferma quasi sempre al primo candidato; se diventa lento con migliaia di Istruttori, memorizzare per stato.
  for (const { formId } of forms) {
    for (const collaborator of ranked) {
      if (covers(collaborator, formId, kind) || !canReach(collaborator, formId, kind, courseXUnlocked)) continue;
      const next = startTeacherCourse(state, collaborator.id, formId, kind, now);
      if (next !== state) return { state: next, formId };
    }
  }
  return none;
}
