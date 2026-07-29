import {
  getActiveCampaignEmails,
  getNextPendingEmailOutcomeDeadline,
  getNextRunningEventDeadline,
  getNextScheduledTrialDeadline,
  getNextSendingEmailDeadline,
  getNextTrainingDeadline,
} from "./runtimeIndexes";
import type { GameState } from "./types";
import { GAME_CONFIG } from "./config";
import { getNextRealtimeEventCooldownDeadline } from "./eventCooldowns";
import { hasActionableAutomaticEvents } from "./eventAutomationFlow";
import {
  hasActiveInstructorAthleticPreparation,
  isAutomaticTeachingKnownIdle,
} from "./automationFlow";
import { isSummerBreak } from "./calendar";
import {
  getEquipmentAutomaticRepairTarget,
  getEquipmentAutomaticRepairUnitCost,
} from "./equipment";
import { gameDelayToWallDelay } from "./gameClock";
import { hasGadgetRuntimeWork } from "./gadgetEconomy";
import { isReptilePreparationWorkActive } from "./reptilePreparation";

export const AUTOMATION_HEARTBEAT_MS = GAME_CONFIG.gameTickMs;
const MAX_TIMEOUT_MS = 2_147_000_000;

function earlier(current: number, candidate: number | undefined): number {
  return candidate === undefined || !Number.isFinite(candidate)
    ? current
    : Math.min(current, candidate);
}

export function needsAutomationHeartbeat(state: GameState): boolean {
  if (state.tournaments.reptile.activeEdition?.status === "preparing") return true;
  const hasWritingCampaign = getActiveCampaignEmails(state.emails)
    .some((email) => email.status === "writing");
  const instructorPreparationActive = hasActiveInstructorAthleticPreparation(state);

  return state.collaborators.some((collaborator) => {
    switch (collaborator.assignment) {
      case "writing":
        return hasWritingCampaign || state.unlocks.social;
      case "equipment":
        {
          const target = getEquipmentAutomaticRepairTarget(state.equipment);
          return target !== undefined &&
            state.school.euros >= getEquipmentAutomaticRepairUnitCost(target);
        }
      case "instructor":
        return instructorPreparationActive;
      case "gadget":
        return hasGadgetRuntimeWork(state);
      case "events":
        // Gli eventi sono discreti: il planner li riattiva sulle dipendenze o
        // alla scadenza del cooldown, senza un controllo ogni secondo.
        return false;
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
    getNextSendingEmailDeadline(state.emails),
  );
  nextDeadline = earlier(
    nextDeadline,
    getNextPendingEmailOutcomeDeadline(state.pendingEmailOutcomes),
  );
  nextDeadline = earlier(
    nextDeadline,
    getNextScheduledTrialDeadline(state.scheduledTrials),
  );
  nextDeadline = earlier(
    nextDeadline,
    getNextRunningEventDeadline(state.acquisitionEvents),
  );
  nextDeadline = earlier(
    nextDeadline,
    getNextTrainingDeadline(state.contacts),
  );
  nextDeadline = earlier(
    nextDeadline,
    getNextTrainingDeadline(state.collaborators),
  );

  return nextDeadline;
}

export function getNextGameTickAt(
  state: GameState,
  now: number,
  allowAutomaticEventStarts = true,
): number {
  let nextDeadline = getNextGameDeadline(state);
  if (isReptilePreparationWorkActive(state)) {
    nextDeadline = earlier(nextDeadline, state.automation.lastProcessedAt + AUTOMATION_HEARTBEAT_MS);
  }
  const hasEventAutomation = state.collaborators.some(
    (collaborator) => collaborator.assignment === "events",
  );
  if (hasEventAutomation && allowAutomaticEventStarts) {
    nextDeadline = hasActionableAutomaticEvents(state, now)
      ? earlier(nextDeadline, now)
      : earlier(nextDeadline, getNextRealtimeEventCooldownDeadline(state, now));
  }
  const hasInstructorAutomation = state.collaborators.some(
    (collaborator) => collaborator.assignment === "instructor",
  );
  if (
    hasInstructorAutomation &&
    state.unlocks.forms &&
    !isSummerBreak(state.school.currentMonth) &&
    !isAutomaticTeachingKnownIdle(state)
  ) {
    nextDeadline = earlier(nextDeadline, now);
  }
  const heartbeatAt = needsAutomationHeartbeat(state)
    ? state.automation.lastProcessedAt + AUTOMATION_HEARTBEAT_MS
    : Infinity;
  return Math.min(nextDeadline, heartbeatAt);
}

export function hasQueuedGameWorkAt(state: GameState, now: number): boolean {
  return state.automation.lastProcessedAt < now || getNextGameDeadline(state) <= now;
}

export function getNextGameTickDelay(
  state: GameState,
  now: number,
  gameSpeed = 1,
): number {
  const requestedDelay = Math.max(0, getNextGameTickAt(state, now) - now);
  return Math.min(
    MAX_TIMEOUT_MS,
    gameDelayToWallDelay(requestedDelay, gameSpeed),
  );
}
