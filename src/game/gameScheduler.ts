import {
  getActiveCampaignEmails,
  getPendingEmailOutcomes,
  getPeopleInTraining,
  getRunningAcquisitionEvents,
  getScheduledTrials,
  getSendingEmails,
} from "./runtimeIndexes";
import type { GameState } from "./types";
import { GAME_CONFIG } from "./config";

export const AUTOMATION_HEARTBEAT_MS = GAME_CONFIG.gameTickMs;
const MAX_TIMEOUT_MS = 2_147_000_000;

function earlier(current: number, candidate: number | undefined): number {
  return candidate === undefined || !Number.isFinite(candidate)
    ? current
    : Math.min(current, candidate);
}

function earliest<T>(
  values: readonly T[],
  readTimestamp: (value: T) => number | undefined,
): number | undefined {
  let result: number | undefined;
  for (const value of values) {
    const timestamp = readTimestamp(value);
    if (
      timestamp !== undefined &&
      Number.isFinite(timestamp) &&
      (result === undefined || timestamp < result)
    ) {
      result = timestamp;
    }
  }
  return result;
}

export function needsAutomationHeartbeat(state: GameState): boolean {
  const hasWritingCampaign = getActiveCampaignEmails(state.emails)
    .some((email) => email.status === "writing");
  const hasEnrolledAthlete = state.school.activeMembers > 0;

  return state.collaborators.some((collaborator) => {
    switch (collaborator.assignment) {
      case "writing":
        return hasWritingCampaign;
      case "lessons":
        return hasEnrolledAthlete;
      case "social":
        return state.unlocks.social;
      case "equipment":
        return state.equipment.wear > 0 || state.equipment.damagedSwords > 0;
      case "events":
      case "instructor":
        // Questi ruoli possono avviare nuovo lavoro dopo un cambio di stato.
        return true;
      default:
        return false;
    }
  });
}

export function getNextGameDeadline(state: GameState): number {
  let nextDeadline = Number.isFinite(state.school.nextFeeAt)
    ? state.school.nextFeeAt
    : Infinity;

  if (state.school.activeMembers > 0) {
    nextDeadline = earlier(nextDeadline, state.narrative.nextEventAt);
  }
  nextDeadline = earlier(
    nextDeadline,
    earliest(getSendingEmails(state.emails), (email) => email.sendCompletesAt),
  );
  nextDeadline = earlier(
    nextDeadline,
    earliest(
      getPendingEmailOutcomes(state.pendingEmailOutcomes).filter(
        (outcome) => !outcome.waitForTutorialEvent,
      ),
      (outcome) => outcome.resolvesAt,
    ),
  );
  nextDeadline = earlier(
    nextDeadline,
    earliest(
      getScheduledTrials(state.scheduledTrials),
      (trial) => trial.equipmentUsed ? trial.resolvesAt : trial.startsAt,
    ),
  );
  nextDeadline = earlier(
    nextDeadline,
    earliest(getRunningAcquisitionEvents(state.acquisitionEvents), (event) => event.resolvesAt),
  );
  nextDeadline = earlier(
    nextDeadline,
    earliest(
      getPeopleInTraining(state.contacts),
      (contact) => contact.training?.status === "waitingForEquipment"
        ? undefined
        : contact.training?.completesAt,
    ),
  );
  nextDeadline = earlier(
    nextDeadline,
    earliest(
      getPeopleInTraining(state.collaborators),
      (collaborator) => collaborator.training?.status === "waitingForEquipment"
        ? undefined
        : collaborator.training?.completesAt,
    ),
  );

  return nextDeadline;
}

export function getNextGameTickDelay(state: GameState, now: number): number {
  let nextDeadline = getNextGameDeadline(state);
  const hasEventAutomation = state.collaborators.some(
    (collaborator) => collaborator.assignment === "events",
  );
  if (hasEventAutomation && state.activities.nextSparringAt > now) {
    nextDeadline = earlier(nextDeadline, state.activities.nextSparringAt);
  }
  const deadlineDelay = Math.max(0, nextDeadline - now);
  const automationHeartbeatDelay = Math.max(
    0,
    AUTOMATION_HEARTBEAT_MS - Math.max(0, now - state.automation.lastProcessedAt),
  );
  const requestedDelay = needsAutomationHeartbeat(state)
    ? Math.min(automationHeartbeatDelay, deadlineDelay)
    : deadlineDelay;
  return Math.min(MAX_TIMEOUT_MS, requestedDelay);
}
