import { getCollaboratorProductivity } from "../content/forms";
import { COLLABORATOR_MASTERY_XP } from "../content/mastery";
import { addLegendaryEncounters, createAcquiredContacts } from "./contacts";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { selectIncomePerMonth } from "./selectors";
import { addCollaboratorMasteryExperience } from "./stateUpdates";
import type { GameState } from "./types";

export function processOfflinePassiveProgress(
  state: GameState,
  now: number,
  elapsedMs: number,
  rawElapsedMs: number,
): GameState {
  const automationMultiplier = 1 + getUpgradeEffectTotal(state.upgrades, "automationMultiplier");
  const socialMultiplier = 1 + getUpgradeEffectTotal(state.upgrades, "socialMultiplier");
  const socialProductivity = state.unlocks.social
    ? state.collaborators
        .filter((collaborator) => collaborator.assignment === "social")
        .reduce((total, collaborator) => total + getCollaboratorProductivity(collaborator), 0)
    : 0;
  const socialTotal = state.automation.socialBuffer +
    (elapsedMs / GAME_CONFIG.socialContactIntervalMs) *
      socialProductivity *
      socialMultiplier *
      automationMultiplier *
      GAME_CONFIG.offlineGainMultiplier;
  const socialContacts = Math.floor(socialTotal);
  const eurosEarned = roundCurrency(
    selectIncomePerMonth(state) *
      (elapsedMs / GAME_CONFIG.gameMonthMs) *
      GAME_CONFIG.offlineGainMultiplier,
  );
  const shiftTraining = <T extends { training?: { startedAt: number; completesAt: number } }>(
    person: T,
  ): T => person.training
    ? {
        ...person,
        training: {
          ...person.training,
          startedAt: person.training.startedAt + rawElapsedMs,
          completesAt: person.training.completesAt + rawElapsedMs,
        },
      }
    : person;
  let nextState: GameState = {
    ...state,
    school: {
      ...state.school,
      euros: state.school.euros + eurosEarned,
      nextFeeAt: state.school.nextFeeAt + rawElapsedMs,
    },
    contacts: state.contacts.map(shiftTraining),
    collaborators: state.collaborators.map(shiftTraining),
    emails: state.emails.map((email) => email.sendCompletesAt
      ? { ...email, sendCompletesAt: email.sendCompletesAt + rawElapsedMs }
      : email),
    pendingEmailOutcomes: state.pendingEmailOutcomes.map((outcome) => ({
      ...outcome,
      resolvesAt: outcome.resolvesAt + rawElapsedMs,
    })),
    scheduledTrials: state.scheduledTrials.map((trial) => ({
      ...trial,
      startsAt: trial.startsAt + rawElapsedMs,
      resolvesAt: trial.resolvesAt + rawElapsedMs,
    })),
    acquisitionEvents: state.acquisitionEvents.map((event) => ({
      ...event,
      startedAt: event.startedAt + rawElapsedMs,
      resolvesAt: event.resolvesAt + rawElapsedMs,
    })),
    activities: { nextSparringAt: state.activities.nextSparringAt + rawElapsedMs },
    narrative: { ...state.narrative, nextEventAt: state.narrative.nextEventAt + rawElapsedMs },
    automation: {
      ...state.automation,
      lastProcessedAt: now,
      socialBuffer: socialTotal - socialContacts,
    },
    statistics: {
      ...state.statistics,
      eurosEarned: state.statistics.eurosEarned + eurosEarned,
    },
  };
  if (socialContacts <= 0) return nextState;

  const acquired = createAcquiredContacts(nextState, socialContacts, "social", now);
  nextState = {
    ...nextState,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(
      nextState.legendaryCollaborators,
      acquired.contacts,
    ),
    contacts: [...nextState.contacts, ...acquired.contacts],
    statistics: {
      ...nextState.statistics,
      contactsAcquired: nextState.statistics.contactsAcquired + socialContacts,
      socialContacts: nextState.statistics.socialContacts + socialContacts,
    },
  };
  return addCollaboratorMasteryExperience(
    nextState,
    "social",
    socialContacts * COLLABORATOR_MASTERY_XP.socialContact,
    now,
  );
}
