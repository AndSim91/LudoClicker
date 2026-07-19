import { ACQUISITION_EVENTS } from "../content/events";
import { getEventFunnelOutcome } from "./formulas";
import { startAcquisitionEvent } from "./eventFlow";
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
  const idleCollaborators = state.collaborators.filter((collaborator) =>
    collaborator.assignment === "events" &&
    !state.acquisitionEvents.some((event) =>
      event.status === "running" && event.collaboratorId === collaborator.id
    )
  );

  for (const collaborator of idleCollaborators) {
    const candidates = [...EVENT_PREFERENCE].sort((left, right) =>
      expectedContacts(nextState, right) - expectedContacts(nextState, left)
    );
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
