import { ACQUISITION_EVENTS } from "../content/events";
import { getExpectedEventContacts } from "./eventRewards";
import { startAcquisitionEvent } from "./eventFlow";
import { getRunningAcquisitionEvents } from "./runtimeIndexes";
import type { GameState } from "./types";

function expectedContacts(state: GameState, definition: (typeof ACQUISITION_EVENTS)[number]) {
  return getExpectedEventContacts(state, definition);
}

export function processAutomaticEvents(state: GameState, now: number): GameState {
  let nextState = state;
  const busyCollaboratorIds = new Set(
    getRunningAcquisitionEvents(state.acquisitionEvents).flatMap((event) =>
      event.collaboratorId ? [event.collaboratorId] : []
    ),
  );
  const idleCollaborators = state.collaborators.filter((collaborator) =>
    collaborator.assignment === "events" &&
    !busyCollaboratorIds.has(collaborator.id)
  );
  if (idleCollaborators.length === 0) return state;

  const candidates = [...ACQUISITION_EVENTS].sort((left, right) =>
    left.cost - right.cost || expectedContacts(state, right) - expectedContacts(state, left)
  );

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
