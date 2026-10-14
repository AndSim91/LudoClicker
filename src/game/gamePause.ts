import { mapPersonTrainings, type SlottedPerson } from "./trainingSlots";
import type { GameState } from "./types";

function shiftOptional(timestamp: number | undefined, elapsedMs: number) {
  return timestamp === undefined ? undefined : timestamp + elapsedMs;
}

/**
 * Il gioco avanza solo mentre è aperto (Andrea, 28/09 e 14/10/2026): alla
 * riapertura riprende da dove era. Congela interamente il gioco durante la chiusura. Tutti i timer attivi
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
  const shiftTraining = <T extends SlottedPerson>(person: T): T =>
    mapPersonTrainings(person, (training) => ({
      ...training,
      startedAt: training.startedAt + elapsedMs,
      completesAt: training.completesAt + elapsedMs,
    }));

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
    // The event deadline is real time, so closing the game never preserves its remaining duration.
    lightInflation: state.lightInflation,
    narrative: { ...state.narrative, nextEventAt: state.narrative.nextEventAt + elapsedMs },
    // The Reptile bars stop with the game too (6.26).
    tournaments: state.tournaments.reptile.activeEdition
      ? {
          ...state.tournaments,
          reptile: {
            ...state.tournaments.reptile,
            activeEdition: {
              ...state.tournaments.reptile.activeEdition,
              organizedAt: state.tournaments.reptile.activeEdition.organizedAt + elapsedMs,
              lastProgressAt: state.tournaments.reptile.activeEdition.lastProgressAt + elapsedMs,
            },
          },
        }
      : state.tournaments,
    automation: { ...state.automation, lastProcessedAt: now },
  };
}

export function pauseGameState(state: GameState, now: number): GameState {
  return freezeGameState(state, now, now - state.lastSavedAt);
}
