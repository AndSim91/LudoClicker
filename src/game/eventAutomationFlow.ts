import { ACQUISITION_EVENTS } from "../content/events";
import { getEventFunnelOutcome } from "./formulas";
import { startAcquisitionEvent } from "./eventFlow";
import { getRunningAcquisitionEvents } from "./runtimeIndexes";
import type { GameState } from "./types";

const EVENT_PREFERENCE = ACQUISITION_EVENTS
  .filter((definition) => definition.id !== "park-sparring")
  .sort((left, right) => right.baseAttendance * right.demonstrationRate * right.contactRate -
    left.baseAttendance * left.demonstrationRate * left.contactRate);

function expectedContacts(state: GameState, definition: (typeof ACQUISITION_EVENTS)[number]) {
  return getEventFunnelOutcome(state, definition, 1).contactsObtained;
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
