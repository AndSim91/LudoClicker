import { createInitialCollaboratorMastery } from "../content/mastery";
import { getCollaboratorAssignmentLabel } from "../content/collaboratorRoles";
import { getRetainedLegendaryProgress } from "./contacts";
import { makeGameId } from "./ids";
import { getEnrolledLegendaryContacts } from "./runtimeIndexes";
import { addMessage } from "./stateUpdates";
import { unlockSocialIfEligible } from "./unlocks";
import type { Contact, GameState } from "./types";

export function recruitCollaborator(
  state: GameState,
  contact: Contact,
  now: number,
): GameState {
  const qualifiesAsCollaborator = contact.rarity === "legendary" ||
    (contact.rarity === "ultra-rare" && contact.forms.includes("course-y"));
  if (
    !qualifiesAsCollaborator ||
    state.collaborators.some((collaborator) => collaborator.contactId === contact.id)
  ) return state;

  const retained = contact.specialProfileId
    ? getRetainedLegendaryProgress(state.legendaryCollaborators, contact.specialProfileId)
    : undefined;
  const collaborator = {
    id: makeGameId("collaborator", now, state.collaborators.length),
    contactId: contact.id,
    displayName: `${contact.firstName} ${contact.lastName}`,
    joinedAt: retained?.joinedAt ?? now,
    forms: [...(retained?.forms ?? contact.forms)],
    instructorForms: [...(retained?.instructorForms ?? [])],
    technicianForms: [...(retained?.technicianForms ?? [])],
    formBranchPreferences: [
      ...(retained?.formBranchPreferences ?? contact.formBranchPreferences ?? []),
    ],
    assignment: null,
    mastery: retained?.mastery
      ? { ...retained.mastery }
      : createInitialCollaboratorMastery(),
    rarity: contact.rarity,
    specialProfileId: contact.specialProfileId,
    lastFormTrainingYear: retained?.lastFormTrainingYear ?? contact.lastFormTrainingYear,
    formTrainingYearCount:
      retained?.formTrainingYearCount ?? contact.formTrainingYearCount,
    lastAgonistCourseYear:
      retained?.lastAgonistCourseYear ?? contact.lastAgonistCourseYear,
  };
  const nextState: GameState = unlockSocialIfEligible({
    ...state,
    collaborators: [...state.collaborators, collaborator],
    unlocks: { ...state.unlocks, collaborators: true },
    statistics: {
      ...state.statistics,
      collaboratorsRecruited: state.statistics.collaboratorsRecruited + 1,
    },
  }, now);
  const editorialSector = getCollaboratorAssignmentLabel(
    "writing",
    nextState.unlocks.social,
  );
  // 4.1: ordinary collaborators after the first are counted in the yearly digest.
  const legendary = contact.rarity === "legendary";
  if (!legendary && nextState.statistics.collaboratorsRecruited > 1) return nextState;
  return addMessage(
    nextState,
    now + 1,
    "Un nuovo Collaboratore",
    legendary
      ? "Un Leggendario tra i collaboratori. Non succede tutti i giorni: scegli con cura il suo incarico, ogni aiuto possibile è una manna dal cielo!"
      : `Primo collaboratore dell'Ordine. Mettilo in ${editorialSector}, agli Eventi, in Attrezzatura o in palestra: più resta nello stesso posto, più diventa bravo.`,
    "positive",
    "focused",
    "collaborators",
  );
}

export function recruitEnrolledLegendaryCollaborators(
  state: GameState,
  now: number,
): GameState {
  const collaboratorContactIds = new Set(
    state.collaborators.map((collaborator) => collaborator.contactId),
  );
  let nextState = state;
  for (const contact of getEnrolledLegendaryContacts(state.contacts)) {
    if (!collaboratorContactIds.has(contact.id)) {
      nextState = recruitCollaborator(nextState, contact, now);
    }
  }
  return nextState;
}
