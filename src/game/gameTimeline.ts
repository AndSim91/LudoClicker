import type {
  AcquisitionEventCooldown,
  FormTraining,
  GameState,
} from "./types";

function shiftOptional(timestamp: number | undefined, offsetMs: number) {
  return timestamp === undefined ? undefined : timestamp + offsetMs;
}

function shiftTraining<T extends { training?: FormTraining }>(
  person: T,
  offsetMs: number,
): T {
  if (!person.training) return person;
  return {
    ...person,
    training: {
      ...person.training,
      startedAt: person.training.startedAt + offsetMs,
      completesAt: person.training.completesAt + offsetMs,
    },
  };
}

function shiftCooldown(
  cooldown: AcquisitionEventCooldown | undefined,
  offsetMs: number,
): AcquisitionEventCooldown | undefined {
  return cooldown?.kind === "realtime"
    ? {
        ...cooldown,
        startedAt: cooldown.startedAt + offsetMs,
        availableAt: cooldown.availableAt + offsetMs,
      }
    : cooldown;
}

/**
 * Converte uno snapshot fra due origini dello stesso tempo di gioco.
 * Durate, mesi e stagioni restano invariati; cambiano soltanto i timestamp.
 */
export function rebaseGameTimeline(
  state: GameState,
  fromNow: number,
  toNow: number,
): GameState {
  const offsetMs = toNow - fromNow;
  const retainedProgress = Object.fromEntries(
    Object.entries(state.legendaryCollaborators.retainedProgress).map(
      ([profileId, progress]) => [
        profileId,
        progress
          ? { ...progress, joinedAt: progress.joinedAt + offsetMs }
          : progress,
      ],
    ),
  ) as GameState["legendaryCollaborators"]["retainedProgress"];
  const eventCooldowns = Object.fromEntries(
    Object.entries(state.activities.eventCooldowns).map(
      ([definitionId, cooldown]) => [
        definitionId,
        shiftCooldown(cooldown, offsetMs),
      ],
    ),
  ) as GameState["activities"]["eventCooldowns"];

  return {
    ...state,
    createdAt: state.createdAt + offsetMs,
    lastSavedAt: toNow,
    school: {
      ...state.school,
      nextFeeAt: state.school.nextFeeAt + offsetMs,
    },
    network: {
      ...state.network,
      schools: state.network.schools.map((school) => ({
        ...school,
        transferredAt: school.transferredAt + offsetMs,
      })),
    },
    contacts: state.contacts.map((contact) => shiftTraining({
      ...contact,
      acquiredAt: contact.acquiredAt + offsetMs,
    }, offsetMs)),
    emails: state.emails.map((email) => ({
      ...email,
      createdAt: email.createdAt + offsetMs,
      sentAt: shiftOptional(email.sentAt, offsetMs),
      sendCompletesAt: shiftOptional(email.sendCompletesAt, offsetMs),
    })),
    pendingEmailOutcomes: state.pendingEmailOutcomes.map((outcome) => ({
      ...outcome,
      resolvesAt: outcome.resolvesAt + offsetMs,
    })),
    scheduledTrials: state.scheduledTrials.map((trial) => ({
      ...trial,
      startsAt: trial.startsAt + offsetMs,
      resolvesAt: trial.resolvesAt + offsetMs,
    })),
    messages: state.messages.map((message) => ({
      ...message,
      receivedAt: message.receivedAt + offsetMs,
    })),
    acquisitionEvents: state.acquisitionEvents.map((event) => ({
      ...event,
      startedAt: event.startedAt + offsetMs,
      resolvesAt: event.resolvesAt + offsetMs,
    })),
    activities: { eventCooldowns },
    // Light Inflation timestamps are absolute wall-clock values, unlike the game timeline.
    lightInflation: state.lightInflation,
    tournaments: {
      ...state.tournaments,
      results: state.tournaments.results.map((result) => ({
        ...result,
        completedAt: result.completedAt + offsetMs,
      })),
      reptile: {
        ...state.tournaments.reptile,
        activeEdition: state.tournaments.reptile.activeEdition
          ? {
              ...state.tournaments.reptile.activeEdition,
              startedAt: state.tournaments.reptile.activeEdition.startedAt + offsetMs,
              lastProgressAt: state.tournaments.reptile.activeEdition.lastProgressAt + offsetMs,
              bookedAt: shiftOptional(
                state.tournaments.reptile.activeEdition.bookedAt,
                offsetMs,
              ),
              minigame: {
                ...state.tournaments.reptile.activeEdition.minigame,
                startedAt: shiftOptional(
                  state.tournaments.reptile.activeEdition.minigame.startedAt,
                  offsetMs,
                ),
              },
              result: state.tournaments.reptile.activeEdition.result
                ? {
                    ...state.tournaments.reptile.activeEdition.result,
                    completedAt:
                      state.tournaments.reptile.activeEdition.result.completedAt + offsetMs,
                  }
                : undefined,
            }
          : undefined,
        latestRecap: state.tournaments.reptile.latestRecap
          ? {
              ...state.tournaments.reptile.latestRecap,
              completedAt: state.tournaments.reptile.latestRecap.completedAt + offsetMs,
            }
          : undefined,
      },
    },
    legendaryCollaborators: {
      ...state.legendaryCollaborators,
      retainedProgress,
    },
    collaborators: state.collaborators.map((collaborator) => shiftTraining({
      ...collaborator,
      joinedAt: collaborator.joinedAt + offsetMs,
      technicianCourseReservation: collaborator.technicianCourseReservation
        ? {
            ...collaborator.technicianCourseReservation,
            bookedAt: collaborator.technicianCourseReservation.bookedAt + offsetMs,
          }
        : undefined,
    }, offsetMs)),
    automation: {
      ...state.automation,
      lastProcessedAt: state.automation.lastProcessedAt + offsetMs,
    },
    narrative: {
      nextEventAt: state.narrative.nextEventAt + offsetMs,
      history: state.narrative.history.map((event) => ({
        ...event,
        occurredAt: event.occurredAt + offsetMs,
      })),
    },
    shortGoal: {
      ...state.shortGoal,
      startedAt: state.shortGoal.startedAt + offsetMs,
      reactivationStartedAt: shiftOptional(
        state.shortGoal.reactivationStartedAt,
        offsetMs,
      ),
    },
  };
}
