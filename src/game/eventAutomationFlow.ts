import { ACQUISITION_EVENTS } from "../content/events";
import { getExpectedEventContacts } from "./eventRewards";
import { startAcquisitionEvent } from "./eventFlow";
import { getRunningAcquisitionEvents } from "./runtimeIndexes";
import type { GameState } from "./types";

const EVENT_PREFERENCE = ACQUISITION_EVENTS.filter(
  (definition) => definition.id !== "park-sparring",
);

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

  const candidates = [...EVENT_PREFERENCE].sort((left, right) =>
    expectedContacts(state, right) - expectedContacts(state, left)
  );

  for (const collaborator of idleCollaborators) {
    let started = false;
    for (const definition of candidates) {
      const attempted = startAcquisitionEvent(
        nextState,
        definition.id,
        now,
        collaborator.id,
      );
      if (attempted === nextState) continue;
      nextState = attempted;
      started = true;
      break;
    }
    if (started) continue;
    nextState = startAcquisitionEvent(
      nextState,
      "park-sparring",
      now,
      collaborator.id,
    );
  }

  return nextState;
}
