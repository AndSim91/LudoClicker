import type { GameState } from "./types";

export interface OfflineSummary {
  elapsedMs: number;
  capped: false;
  emailsCompleted: 0;
  trialsBooked: 0;
  trialsCompleted: 0;
  membersEnrolled: 0;
  membersDeparted: 0;
  collaboratorsRecruited: 0;
  eurosEarned: 0;
  contactsAcquired: 0;
}

function shiftOptional(timestamp: number | undefined, elapsedMs: number) {
  return timestamp === undefined ? undefined : timestamp + elapsedMs;
}

/**
 * Congela interamente il gioco durante la chiusura. Tutti i timer attivi
 * vengono traslati dello stesso intervallo, così conservano il tempo residuo.
 */
export function freezeGameState(
  state: GameState,
  now: number,
  elapsedMs: number,
): GameState {
  elapsedMs = Math.max(0, elapsedMs);
  if (elapsedMs === 0) {
    return {
      ...state,
      lastSavedAt: now,
      automation: { ...state.automation, lastProcessedAt: now },
    };
  }
  const shiftTraining = <T extends { training?: { startedAt: number; completesAt: number } }>(
    person: T,
  ): T => person.training
    ? {
        ...person,
        training: {
          ...person.training,
          startedAt: person.training.startedAt + elapsedMs,
          completesAt: person.training.completesAt + elapsedMs,
        },
      }
    : person;

  return {
    ...state,
    lastSavedAt: now,
    school: { ...state.school, nextFeeAt: state.school.nextFeeAt + elapsedMs },
    contacts: state.contacts.map(shiftTraining),
    collaborators: state.collaborators.map(shiftTraining),
    emails: state.emails.map((email) => ({
      ...email,
      sendCompletesAt: shiftOptional(email.sendCompletesAt, elapsedMs),
    })),
    pendingEmailOutcomes: state.pendingEmailOutcomes.map((outcome) => ({
      ...outcome,
      resolvesAt: outcome.resolvesAt + elapsedMs,
    })),
    scheduledTrials: state.scheduledTrials.map((trial) => trial.status === "scheduled"
      ? {
          ...trial,
          startsAt: trial.startsAt + elapsedMs,
          resolvesAt: trial.resolvesAt + elapsedMs,
        }
      : trial),
    acquisitionEvents: state.acquisitionEvents.map((event) => event.status === "running"
      ? {
          ...event,
          startedAt: event.startedAt + elapsedMs,
          resolvesAt: event.resolvesAt + elapsedMs,
        }
      : event),
    activities: {
      eventCooldowns: Object.fromEntries(
        Object.entries(state.activities.eventCooldowns).map(([definitionId, cooldown]) => [
          definitionId,
          cooldown?.kind === "realtime"
            ? {
                ...cooldown,
                startedAt: cooldown.startedAt + elapsedMs,
                availableAt: cooldown.availableAt + elapsedMs,
              }
            : cooldown,
        ]),
      ),
    },
    narrative: { ...state.narrative, nextEventAt: state.narrative.nextEventAt + elapsedMs },
    automation: { ...state.automation, lastProcessedAt: now },
  };
}

export function pauseGameState(state: GameState, now: number): GameState {
  return freezeGameState(state, now, now - state.lastSavedAt);
}

export function simulateOfflineProgress(
  state: GameState,
  now: number,
): { state: GameState; summary: null } {
  return { state: pauseGameState(state, now), summary: null };
}
