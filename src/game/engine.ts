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
import { processGadgets } from "./gadgetFlow";
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
  resolveFormTrainingBatch as completeFormTrainingBatch,
  processWaitingTrainings,
  startAgonistCourse as beginAgonistCourse,
  startFormTraining as beginFormTraining,
} from "./trainingFlow";
import { createTrainingStartPlan } from "./trainingStartPlan";
import {
  processPriorityInstructorQualifications,
  processTechnicianCourseReservations,
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

function resolveFormTrainingBatch(
  state: GameState,
  personIds: readonly string[],
  now: number,
): GameState {
  return completeFormTrainingBatch(state, personIds, now, trainingDependencies);
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

interface TickStepResult {
  state: GameState;
  complete: boolean;
  workProcessed: number;
}

function tickStep(
  state: GameState,
  now: number,
  gainMultiplier: number,
  wallNow: number,
  workBudget = Infinity,
  allowAutomaticEventStarts = true,
): TickStepResult {
  let remainingWork = Number.isFinite(workBudget)
    ? Math.max(0, Math.floor(workBudget))
    : Infinity;
  let workProcessed = 0;
  const reserveWork = (available: number): number => {
    const reserved = Math.min(available, remainingWork);
    remainingWork -= reserved;
    workProcessed += reserved;
    return reserved;
  };
  const result = (currentState: GameState, complete: boolean): TickStepResult => ({
    state: currentState,
    complete,
    workProcessed,
  });

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
  nextState = processGadgets(nextState, masteryElapsedMs, now);

  const dueEmails = getSendingEmails(nextState.emails).filter(
    (email) => (email.sendCompletesAt ?? Infinity) <= now,
  );
  const emailWork = reserveWork(dueEmails.length);
  for (const email of dueEmails.slice(0, emailWork)) {
    nextState = finalizeEmail(nextState, email.id, now);
  }
  if (emailWork < dueEmails.length) return result(nextState, false);

  const dueEmailOutcomes = getPendingEmailOutcomes(nextState.pendingEmailOutcomes).filter(
    (outcome) => !outcome.waitForTutorialEvent && outcome.resolvesAt <= now,
  );
  const outcomeWork = reserveWork(dueEmailOutcomes.length);
  for (const outcome of dueEmailOutcomes.slice(0, outcomeWork)) {
    nextState = resolveEmailOutcome(nextState, outcome, now);
  }
  if (outcomeWork < dueEmailOutcomes.length) return result(nextState, false);

  const dueAcquisitionEvents = getRunningAcquisitionEvents(nextState.acquisitionEvents).filter(
    (event) => event.resolvesAt <= now,
  );
  const eventWork = reserveWork(dueAcquisitionEvents.length);
  for (const event of dueAcquisitionEvents.slice(0, eventWork)) {
    nextState = resolveAcquisitionEvent(nextState, event, now, gainMultiplier);
  }
  if (eventWork < dueAcquisitionEvents.length) return result(nextState, false);

  const completedTrainingIds = [
    ...getPeopleInTraining(nextState.contacts),
    ...getPeopleInTraining(nextState.collaborators),
  ].flatMap((person) =>
    person.training!.status !== "waitingForEquipment" &&
      person.training!.completesAt <= now
      ? [person.id]
      : []
  );
  const trainingWork = reserveWork(completedTrainingIds.length);
  nextState = resolveFormTrainingBatch(
    nextState,
    completedTrainingIds.slice(0, trainingWork),
    now,
  );
  if (trainingWork < completedTrainingIds.length) return result(nextState, false);

  const dueTrialStarts = getScheduledTrials(nextState.scheduledTrials).filter(
    (trial) => trial.equipmentUsed === undefined && trial.startsAt <= now,
  );
  const trialStartWork = reserveWork(dueTrialStarts.length);
  nextState = processScheduledTrialStarts(nextState, now, trialStartWork);
  if (trialStartWork < dueTrialStarts.length) return result(nextState, false);

  const trialsToResolve = getScheduledTrials(nextState.scheduledTrials)
    .filter((trial) => trial.resolvesAt <= now);
  const trialResolutionWork = reserveWork(trialsToResolve.length);
  nextState = resolveTrialBatch(
    nextState,
    trialsToResolve.slice(0, trialResolutionWork),
    now,
    gainMultiplier,
  );
  if (trialResolutionWork < trialsToResolve.length) return result(nextState, false);

  nextState = processWaitingTrainings(nextState, now);
  nextState = collectFees(nextState, now, gainMultiplier, wallNow);
  nextState = reconcileCollaboratorManagement(nextState);
  nextState = processPriorityInstructorQualifications(nextState, now);
  nextState = processTechnicianCourseReservations(nextState, now);
  nextState = processAutomaticTeaching(
    nextState,
    now,
    startFormTraining,
    startAgonistCourse,
    createTrainingStartPlan,
  );
  nextState = refreshTrainingDurations(nextState, now);
  nextState = processInstructorAthleticPreparation(
    nextState,
    automationElapsedMs,
  );
  if (allowAutomaticEventStarts) {
    nextState = processAutomaticEvents(nextState, now);
  }
  nextState = processNarrativeEvent(nextState, now, gainMultiplier);
  return result(notifyPrestigeOffer(nextState, now), true);
}

export const MAX_CATCH_UP_STEPS_PER_TICK = 8;
export const MAX_SIMULTANEOUS_WORK_PER_SLICE = 100;

function completeTickStep(
  state: GameState,
  now: number,
  gainMultiplier: number,
  wallNow: number,
  workBudget = Infinity,
  allowAutomaticEventStarts = true,
): TickStepResult {
  const resolved = tickStep(
    state,
    now,
    gainMultiplier,
    wallNow,
    workBudget,
    allowAutomaticEventStarts,
  );
  if (!resolved.complete) return resolved;
  const reconciled = reconcileCollaboratorManagement(
    recruitEnrolledLegendaryCollaborators(resolved.state, now),
  );
  const progressed = completeShortGoal(
    grantAchievements(reconciled, now, gainMultiplier),
    now,
    gainMultiplier,
  );
  return {
    ...resolved,
    state: compactChangedHistory(state, progressed, {
      type: "TICK",
      now,
      gainMultiplier,
    }),
  };
}

function tick(
  state: GameState,
  now: number,
  gainMultiplier: number,
  stepBudget?: number,
  wallNow = now,
  workBudget = Infinity,
  allowAutomaticEventStarts = true,
): GameState {
  let nextState = state;
  let stalledAt: number | undefined;
  const hasStepBudget = stepBudget !== undefined;
  const maxSteps = stepBudget === undefined || !Number.isFinite(stepBudget)
    ? Infinity
    : Math.max(1, Math.floor(stepBudget));
  let remainingWorkBudget = Number.isFinite(workBudget)
    ? Math.max(1, Math.floor(workBudget))
    : Infinity;

  for (let step = 0; step < maxSteps; step += 1) {
    const cursor = nextState.automation.lastProcessedAt;
    const scheduledAt = getNextGameTickAt(
      nextState,
      cursor,
      allowAutomaticEventStarts,
    );
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
    const completedStep = completeTickStep(
      previousState,
      boundary,
      gainMultiplier,
      wallNow,
      remainingWorkBudget,
      allowAutomaticEventStarts,
    );
    nextState = completedStep.state;
    remainingWorkBudget -= completedStep.workProcessed;
    if (!completedStep.complete) break;
    if (boundary >= now) break;
    if (remainingWorkBudget <= 0) break;
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
