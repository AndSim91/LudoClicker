import {
  createGameActionHandlers,
  dispatchGameAction,
} from "./actionHandlers";
import {
  processAutomaticTeaching,
  processAutomation,
  runSocialCampaign as executeSocialCampaign,
} from "./automationFlow";
import {
  recruitCollaborator,
  recruitEnrolledLegendaryCollaborators,
} from "./collaboratorFlow";
import {
  finalizeEmail,
  resolveEmailOutcome,
  startNextCampaign,
} from "./emailFlow";
import { resolveAcquisitionEvent } from "./eventFlow";
import { createInitialState as buildInitialState } from "./initialState";
import { collectFees } from "./membershipFlow";
import { notifyPrestigeOffer, processNarrativeEvent } from "./narrativeFlow";
import {
  completeShortGoal,
  grantAchievements,
} from "./schoolProgressionFlow";
import {
  addCollaboratorMasteryExperience,
  addMessage,
} from "./stateUpdates";
import {
  resolveFormTraining as completeFormTraining,
  startFormTraining as beginFormTraining,
} from "./trainingFlow";
import { resolveTrial } from "./trialFlow";
import type {
  FormId,
  GameAction,
  GameState,
  LegendaryCollaboratorProgress,
} from "./types";
import { write, writeCharacters } from "./writingFlow";

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
  addCollaboratorMasteryExperience,
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

const automationDependencies = {
  addMessage,
  addCollaboratorMasteryExperience,
  writeCharacters,
  startNextCampaign,
  startFormTraining,
};

function advanceAutomation(
  state: GameState,
  now: number,
  gainMultiplier: number,
): GameState {
  return processAutomation(state, now, gainMultiplier, automationDependencies);
}

function runSocialCampaign(state: GameState, now: number): GameState {
  return executeSocialCampaign(state, now, automationDependencies);
}

function tick(state: GameState, now: number, gainMultiplier: number): GameState {
  let nextState = advanceAutomation(state, now, gainMultiplier);

  for (const email of nextState.emails.slice()) {
    if (email.status === "sending" && (email.sendCompletesAt ?? Infinity) <= now) {
      nextState = finalizeEmail(nextState, email.id, now);
    }
  }
  for (const outcome of nextState.pendingEmailOutcomes.slice()) {
    if (outcome.resolvesAt <= now) {
      nextState = resolveEmailOutcome(nextState, outcome, now);
    }
  }
  for (const trial of nextState.scheduledTrials.slice()) {
    if (trial.status === "scheduled" && trial.resolvesAt <= now) {
      nextState = resolveTrial(nextState, trial, now, gainMultiplier);
    }
  }
  for (const event of nextState.acquisitionEvents.slice()) {
    if (event.status === "running" && event.resolvesAt <= now) {
      nextState = resolveAcquisitionEvent(nextState, event, now, gainMultiplier);
    }
  }
  for (const contact of nextState.contacts.slice()) {
    if (contact.training && contact.training.completesAt <= now) {
      nextState = resolveFormTraining(nextState, contact.id, now);
    }
  }
  for (const collaborator of nextState.collaborators.slice()) {
    if (collaborator.training && collaborator.training.completesAt <= now) {
      nextState = resolveFormTraining(nextState, collaborator.id, now);
    }
  }

  nextState = collectFees(nextState, now, gainMultiplier);
  nextState = processAutomaticTeaching(nextState, now, startFormTraining);
  nextState = processNarrativeEvent(nextState, now, gainMultiplier);
  return notifyPrestigeOffer(nextState, now);
}

const ACTION_HANDLERS = createGameActionHandlers({
  write,
  tick,
  runSocialCampaign,
  startFormTraining,
});

export function gameReducer(state: GameState, action: GameAction): GameState {
  const nextState = dispatchGameAction(state, action, ACTION_HANDLERS);
  const now = "now" in action ? action.now : state.lastSavedAt;
  const reconciledState = recruitEnrolledLegendaryCollaborators(nextState, now);
  if (action.type === "OFFLINE_PASSIVE_PROGRESS") return reconciledState;

  const gainMultiplier = action.type === "TICK" ? (action.gainMultiplier ?? 1) : 1;
  return completeShortGoal(
    grantAchievements(reconciledState, now, gainMultiplier),
    now,
    gainMultiplier,
  );
}
