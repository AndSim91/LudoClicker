import { createInitialCollaboratorMastery } from "../content/mastery";
import { getCollaboratorAssignmentLabel } from "../content/collaboratorRoles";
import { hasAutomaticInstructorCertificates } from "../content/upgrades";
import { makeGameId } from "./ids";
import { getEnrolledLegendaryContacts } from "./runtimeIndexes";
import { addMessage } from "./stateUpdates";
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
    ? state.legendaryCollaborators.retainedProgress[contact.specialProfileId]
    : undefined;
  const collaborator = {
    id: makeGameId("collaborator", now, state.collaborators.length),
    contactId: contact.id,
    displayName: `${contact.firstName} ${contact.lastName}`,
    joinedAt: retained?.joinedAt ?? now,
    forms: [...(retained?.forms ?? contact.forms)],
    instructorForms: hasAutomaticInstructorCertificates(state.upgrades)
      ? [...(retained?.forms ?? contact.forms)]
      : [...(retained?.instructorForms ?? [])],
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
  const nextState: GameState = {
    ...state,
    collaborators: [...state.collaborators, collaborator],
    unlocks: { ...state.unlocks, collaborators: true },
    statistics: {
      ...state.statistics,
      collaboratorsRecruited: state.statistics.collaboratorsRecruited + 1,
    },
  };
  const editorialSector = getCollaboratorAssignmentLabel(
    "writing",
    nextState.unlocks.social,
  );
  return addMessage(
    nextState,
    now + 1,
    "Nuovo collaboratore disponibile",
    `${collaborator.displayName} è il nuovo collaboratore della scuola. Può aiutare in vari settori automatizzando il lavoro o potenziandone l'efficacia.\n\nPuoi impiegarlo in ${editorialSector}, Eventi, Attrezzatura o come Istruttore.\n\nPuò anche migliorare nel tempo la sua efficacia impiegandolo più tempo in un solo ruolo.`,
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
