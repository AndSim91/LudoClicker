import { ACQUISITION_EVENTS } from "../content/events";
import { getExpectedEventContacts } from "./eventRewards";
import {
  canStartAcquisitionEvent,
  createEventStartCheckContext,
  startAcquisitionEvent,
} from "./eventFlow";
import { getBusyEventCollaboratorIds } from "./runtimeIndexes";
import type { GameState } from "./types";

function expectedContacts(state: GameState, definition: (typeof ACQUISITION_EVENTS)[number]) {
  return getExpectedEventContacts(state, definition);
}

function getIdleEventCollaborators(state: GameState) {
  const busyCollaboratorIds = getBusyEventCollaboratorIds(state.acquisitionEvents);
  return state.collaborators.filter((collaborator) =>
    collaborator.assignment === "events" &&
    !busyCollaboratorIds.has(collaborator.id)
  );
}

function getAutomaticEventCandidates(state: GameState) {
  return [...ACQUISITION_EVENTS].sort((left, right) =>
    left.cost - right.cost || expectedContacts(state, right) - expectedContacts(state, left)
  );
}

export function hasActionableAutomaticEvents(state: GameState, now: number): boolean {
  const idleCollaborators = getIdleEventCollaborators(state);
  if (idleCollaborators.length === 0) return false;
  const candidates = getAutomaticEventCandidates(state);
  const checkContext = createEventStartCheckContext(state);
  return idleCollaborators.some((collaborator) =>
    candidates.some((definition) =>
      canStartAcquisitionEvent(
        state,
        definition.id,
        now,
        collaborator.id,
        checkContext,
      )
    )
  );
}

export function processAutomaticEvents(state: GameState, now: number): GameState {
  let nextState = state;
  const idleCollaborators = getIdleEventCollaborators(state);
  if (idleCollaborators.length === 0) return state;
  const candidates = getAutomaticEventCandidates(state);
  if (!hasActionableAutomaticEvents(state, now)) return state;

  for (const collaborator of idleCollaborators) {
    for (const definition of candidates) {
      const attempted = startAcquisitionEvent(
        nextState,
        definition.id,
        now,
        collaborator.id,
      );
      if (attempted === nextState) continue;
      nextState = attempted;
      break;
    }
  }

  return nextState;
}
