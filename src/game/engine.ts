import {
  createGameActionHandlers,
  dispatchGameAction,
} from "./actionHandlers";
import {
  processAutomaticTeaching,
  processAutomation,
  processInstructorAthleticPreparation,
} from "./automationFlow";
import {
  recruitCollaborator,
  recruitEnrolledLegendaryCollaborators,
} from "./collaboratorFlow";
import { reconcileCollaboratorManagement } from "./collaboratorManagement";
import {
  finalizeEmail,
  resolveEmailOutcome,
} from "./emailFlow";
import { resolveAcquisitionEvent } from "./eventFlow";
import { processAutomaticEvents } from "./eventAutomationFlow";
import { createInitialState as buildInitialState } from "./initialState";
import { collectFees } from "./membershipFlow";
import { compactGameHistory } from "./historyArchive";
import {
  AUTOMATION_HEARTBEAT_MS,
  getNextGameTickAt,
  needsAutomationHeartbeat,
} from "./gameScheduler";
import { notifyPrestigeOffer, processNarrativeEvent } from "./narrativeFlow";
import {
  completeShortGoal,
  grantAchievements,
  synchronizeInactiveShortGoal,
} from "./schoolProgressionFlow";
import {
  addAssignedCollaboratorMasteryExperience,
  addMessage,
} from "./stateUpdates";
import {
  resolveFormTraining as completeFormTraining,
  processWaitingTrainings,
  startAgonistCourse as beginAgonistCourse,
  startFormTraining as beginFormTraining,
} from "./trainingFlow";
import { createTrainingStartPlan } from "./trainingStartPlan";
import {
  processPriorityInstructorQualifications,
  processTeacherTraining,
  refreshTrainingDurations,
} from "./teacherTrainingFlow";
import { processScheduledTrialStarts, resolveTrialBatch } from "./trialFlow";
import { compactTournamentHistory } from "./tournamentFlow";
import {
  getPendingEmailOutcomes,
  getPeopleInTraining,
  getRunningAcquisitionEvents,
  getScheduledTrials,
  getSendingEmails,
} from "./runtimeIndexes";
import type {
  FormId,
  GameAction,
  GameState,
  LegendaryCollaboratorProgress,
} from "./types";
import { sendEmail, write, writeCharacters } from "./writingFlow";

export { getLegendaryAppearanceChance } from "./contacts";
export { canFoundSchool, getPrestigeRequirements } from "./progression";
export { getLegendaryEnrollmentChance } from "./trialFlow";

export function createInitialState(
  now = Date.now(),
  displayName = "",
  includeAndrea = true,
  existingLegendaryProgress?: LegendaryCollaboratorProgress,
): GameState {
  return buildInitialState(now, displayName, includeAndrea, existingLegendaryProgress);
}

const trainingDependencies = {
  addMessage,
  recruitCollaborator,
};

function startFormTraining(
  state: GameState,
  personId: string,
  formId: FormId,
  now: number,
): GameState {
  return beginFormTraining(state, personId, formId, now);
}

function resolveFormTraining(state: GameState, personId: string, now: number): GameState {
  return completeFormTraining(state, personId, now, trainingDependencies);
}

function startAgonistCourse(
  state: GameState,
  personId: string,
  instructorId: string,
  now: number,
): GameState {
  return beginAgonistCourse(state, personId, instructorId, now);
}

const automationDependencies = {
  addMessage,
  writeCharacters,
  startFormTraining,
  startAgonistCourse,
};

function advanceAutomation(
  state: GameState,
  now: number,
  gainMultiplier: number,
): GameState {
  return processAutomation(state, now, gainMultiplier, automationDependencies);
}

function tickStep(
  state: GameState,
  now: number,
  gainMultiplier: number,
  wallNow: number,
): GameState {
  // La pausa aggiorna lastProcessedAt: questo intervallo rappresenta soltanto
  // il tempo di gioco attivo trascorso con l'assegnazione corrente.
  const masteryElapsedMs = Math.max(0, now - state.automation.lastProcessedAt);
  const automationElapsedMs = Math.min(1_000, masteryElapsedMs);
  let nextState = addAssignedCollaboratorMasteryExperience(
    state,
    masteryElapsedMs,
    now,
  );
  nextState = advanceAutomation(nextState, now, gainMultiplier);

  for (const email of getSendingEmails(nextState.emails)) {
    if ((email.sendCompletesAt ?? Infinity) <= now) {
      nextState = finalizeEmail(nextState, email.id, now);
    }
  }
  for (const outcome of getPendingEmailOutcomes(nextState.pendingEmailOutcomes)) {
    if (!outcome.waitForTutorialEvent && outcome.resolvesAt <= now) {
      nextState = resolveEmailOutcome(nextState, outcome, now);
    }
  }
  for (const event of getRunningAcquisitionEvents(nextState.acquisitionEvents)) {
    if (event.resolvesAt <= now) {
      nextState = resolveAcquisitionEvent(nextState, event, now, gainMultiplier);
    }
  }
  for (const contact of getPeopleInTraining(nextState.contacts)) {
    if (
      contact.training!.status !== "waitingForEquipment" &&
      contact.training!.completesAt <= now
    ) {
      nextState = resolveFormTraining(nextState, contact.id, now);
    }
  }
  for (const collaborator of getPeopleInTraining(nextState.collaborators)) {
    if (
      collaborator.training!.status !== "waitingForEquipment" &&
      collaborator.training!.completesAt <= now
    ) {
      nextState = resolveFormTraining(nextState, collaborator.id, now);
    }
  }

  nextState = processScheduledTrialStarts(nextState, now);
  const trialsToResolve = getScheduledTrials(nextState.scheduledTrials)
    .filter((trial) => trial.resolvesAt <= now);
  nextState = resolveTrialBatch(nextState, trialsToResolve, now, gainMultiplier);
  nextState = processWaitingTrainings(nextState, now);
  nextState = collectFees(nextState, now, gainMultiplier, wallNow);
  nextState = reconcileCollaboratorManagement(nextState);
  nextState = processPriorityInstructorQualifications(nextState, now);
  nextState = processAutomaticTeaching(
    nextState,
    now,
    startFormTraining,
    startAgonistCourse,
    createTrainingStartPlan,
  );
  nextState = processTeacherTraining(nextState, now);
  nextState = refreshTrainingDurations(nextState, now);
  nextState = processInstructorAthleticPreparation(
    nextState,
    automationElapsedMs,
  );
  nextState = processAutomaticEvents(nextState, now);
  nextState = processNarrativeEvent(nextState, now, gainMultiplier);
  return notifyPrestigeOffer(nextState, now);
}

export const MAX_CATCH_UP_STEPS_PER_TICK = 8;

function completeTickStep(
  state: GameState,
  now: number,
  gainMultiplier: number,
  wallNow: number,
): GameState {
  const resolved = tickStep(state, now, gainMultiplier, wallNow);
  const reconciled = reconcileCollaboratorManagement(
    recruitEnrolledLegendaryCollaborators(resolved, now),
  );
  const progressed = completeShortGoal(
    grantAchievements(reconciled, now, gainMultiplier),
    now,
    gainMultiplier,
  );
  return compactChangedHistory(state, progressed, {
    type: "TICK",
    now,
    gainMultiplier,
  });
}

function tick(
  state: GameState,
  now: number,
  gainMultiplier: number,
  stepBudget?: number,
  wallNow = now,
): GameState {
  let nextState = state;
  let stalledAt: number | undefined;
  const hasStepBudget = stepBudget !== undefined;
  const maxSteps = stepBudget === undefined || !Number.isFinite(stepBudget)
    ? Infinity
    : Math.max(1, Math.floor(stepBudget));

  for (let step = 0; step < maxSteps; step += 1) {
    const cursor = nextState.automation.lastProcessedAt;
    const scheduledAt = getNextGameTickAt(nextState, cursor);
    const scheduledBoundary = Math.max(cursor, scheduledAt);
    if (
      step > 0 &&
      hasStepBudget &&
      scheduledBoundary > now &&
      needsAutomationHeartbeat(nextState)
    ) break;
    let boundary = now <= cursor
      ? now
      : Math.min(now, scheduledBoundary);
    if (stalledAt === cursor && boundary === cursor) {
      boundary = Math.min(now, cursor + AUTOMATION_HEARTBEAT_MS);
    }

    const previousState = nextState;
    nextState = completeTickStep(previousState, boundary, gainMultiplier, wallNow);
    if (boundary >= now) break;
    stalledAt = boundary === cursor && nextState === previousState
      ? cursor
      : undefined;
  }

  return nextState;
}

const ACTION_HANDLERS = createGameActionHandlers({
  write,
  sendEmail,
  tick,
  startFormTraining,
});

function compactChangedHistory(
  previous: GameState,
  next: GameState,
  action: GameAction,
): GameState {
  const terminalHistoryChanged =
    previous.statistics.contactsLost !== next.statistics.contactsLost ||
    previous.statistics.membersDeparted !== next.statistics.membersDeparted ||
    previous.statistics.trialsCompleted !== next.statistics.trialsCompleted ||
    previous.statistics.eventsCompleted !== next.statistics.eventsCompleted;
  const adminRemovedMembers = action.type === "ADMIN_ADD_MEMBERS" && action.amount < 0;
  const compacted = terminalHistoryChanged || adminRemovedMembers || action.type === "REPLACE_STATE"
    ? compactGameHistory(next)
    : next;
  return action.type === "REPLACE_STATE"
    ? compactTournamentHistory(compacted)
    : compacted;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const now = "now" in action ? action.now : state.lastSavedAt;
  const preparedState = synchronizeInactiveShortGoal(state, now);
  const nextState = dispatchGameAction(preparedState, action, ACTION_HANDLERS);
  if (action.type === "TICK" || action.type === "ADMIN_ADVANCE_MONTH") {
    return nextState;
  }
  const reconciledState = reconcileCollaboratorManagement(
    recruitEnrolledLegendaryCollaborators(nextState, now),
  );
  if (action.type === "RESUME_FROM_PAUSE") {
    return compactChangedHistory(state, reconciledState, action);
  }

  const gainMultiplier = 1;
  return compactChangedHistory(
    state,
    completeShortGoal(
      grantAchievements(reconciledState, now, gainMultiplier),
      now,
      gainMultiplier,
    ),
    action,
  );
}
