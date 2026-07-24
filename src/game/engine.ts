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
  startNextCampaign,
} from "./emailFlow";
import { resolveAcquisitionEvent } from "./eventFlow";
import { processAutomaticEvents } from "./eventAutomationFlow";
import { createInitialState as buildInitialState } from "./initialState";
import { collectFees } from "./membershipFlow";
import { compactGameHistory } from "./historyArchive";
import { notifyPrestigeOffer, processNarrativeEvent } from "./narrativeFlow";
import {
  completeShortGoal,
  grantAchievements,
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
import {
  processTeacherTraining,
  refreshTrainingDurations,
} from "./teacherTrainingFlow";
import { processScheduledTrialStarts, resolveTrial } from "./trialFlow";
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
  return beginFormTraining(state, personId, formId, now, trainingDependencies);
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
  startNextCampaign,
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

function tick(state: GameState, now: number, gainMultiplier: number): GameState {
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
  for (const trial of getScheduledTrials(nextState.scheduledTrials)) {
    if (trial.resolvesAt <= now) {
      nextState = resolveTrial(nextState, trial, now, gainMultiplier);
    }
  }
  nextState = processWaitingTrainings(nextState, now, trainingDependencies);
  nextState = collectFees(nextState, now, gainMultiplier);
  nextState = reconcileCollaboratorManagement(nextState);
  nextState = processAutomaticTeaching(
    nextState,
    now,
    startFormTraining,
    startAgonistCourse,
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
  const nextState = dispatchGameAction(state, action, ACTION_HANDLERS);
  const now = "now" in action ? action.now : state.lastSavedAt;
  const reconciledState = reconcileCollaboratorManagement(
    recruitEnrolledLegendaryCollaborators(nextState, now),
  );
  if (action.type === "RESUME_FROM_PAUSE") {
    return compactChangedHistory(state, reconciledState, action);
  }

  const gainMultiplier = action.type === "TICK" ? (action.gainMultiplier ?? 1) : 1;
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
