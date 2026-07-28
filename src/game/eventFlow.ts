import { getAcquisitionEventDefinition } from "../content/events";
import { getCollaboratorMasteryDefinition } from "../content/mastery";
import { GAME_CONFIG } from "./config";
import {
  completeEquipmentUse,
  getPlannedEquipmentWear,
  getAvailableSwords,
  reserveSwords,
} from "./equipment";
import { scaleContactGain } from "./economy";
import { createEventCooldown, isEventCooldownActive } from "./eventCooldowns";
import { getEventFunnelOutcome } from "./formulas";
import { rollEventContactReward } from "./eventRewards";
import { createAcquiredContacts, addLegendaryEncounters, mergeAcquiredContacts } from "./contacts";
import { makeGameId } from "./ids";
import { nextRandom } from "./random";
import { addMessage } from "./stateUpdates";
import { selectAvailableEventMembers } from "./selectors";
import { startNextCampaign } from "./emailFlow";
import { getArchivedCompletedEventCount } from "./historyArchive";
import {
  getBusyEventCollaboratorIds,
  getCollaboratorsById,
  getRunningEventDefinitionIds,
} from "./runtimeIndexes";
import { isGameAreaUnlocked } from "./progression";
import {
  FIRST_EVENT_TUTORIAL_SCENE_ID,
  isTutorialScenePending,
} from "./tutorialProgress";
import type { AcquisitionEvent, Collaborator, GameState } from "./types";

export interface EventStartCheckContext {
  runningDefinitionIds: ReadonlySet<AcquisitionEvent["definitionId"]>;
  busyCollaboratorIds: ReadonlySet<string>;
  collaboratorsById: ReadonlyMap<string, Collaborator>;
  availableMembers: number;
  availableSwords: number;
}

export function createEventStartCheckContext(state: GameState): EventStartCheckContext {
  return {
    runningDefinitionIds: getRunningEventDefinitionIds(state.acquisitionEvents),
    busyCollaboratorIds: getBusyEventCollaboratorIds(state.acquisitionEvents),
    collaboratorsById: getCollaboratorsById(state.collaborators),
    availableMembers: selectAvailableEventMembers(state),
    availableSwords: getAvailableSwords(state.equipment),
  };
}

function getEventStartDetails(
  state: GameState,
  definitionId: AcquisitionEvent["definitionId"],
  now: number,
  collaboratorId?: string,
  checkContext = createEventStartCheckContext(state),
) {
  const definition = getAcquisitionEventDefinition(definitionId);
  if (!definition || checkContext.runningDefinitionIds.has(definitionId)) return undefined;
  const collaborator = collaboratorId
    ? checkContext.collaboratorsById.get(collaboratorId)
    : undefined;
  if (
    collaboratorId &&
    (
      collaborator?.assignment !== "events" ||
      checkContext.busyCollaboratorIds.has(collaboratorId)
    )
  ) return undefined;
  if (isEventCooldownActive(state.activities.eventCooldowns[definitionId], state, now)) {
    return undefined;
  }
  if (
    state.school.fame < definition.unlockMembers ||
    checkContext.availableMembers < definition.requiredMembers ||
    checkContext.availableSwords < definition.requiredSwords
  ) return undefined;

  const masteryDefinition = collaborator
    ? getCollaboratorMasteryDefinition(collaborator.mastery?.events ?? 0)
    : undefined;
  const eventCost = Math.round(
    definition.cost * (masteryDefinition?.eventCostMultiplier ?? 1),
  );
  if (state.school.euros < eventCost) return undefined;
  return { definition, masteryDefinition, eventCost };
}

export function canStartAcquisitionEvent(
  state: GameState,
  definitionId: AcquisitionEvent["definitionId"],
  now: number,
  collaboratorId?: string,
  checkContext?: EventStartCheckContext,
): boolean {
  return Boolean(
    getEventStartDetails(state, definitionId, now, collaboratorId, checkContext),
  );
}

export function startAcquisitionEvent(
  state: GameState,
  definitionId: AcquisitionEvent["definitionId"],
  now: number,
  collaboratorId?: string,
): GameState {
  const details = getEventStartDetails(state, definitionId, now, collaboratorId);
  if (!details) return state;
  const { definition, masteryDefinition, eventCost } = details;
  const masteryBonus = masteryDefinition?.multiplier ?? 0;

  const [varianceRoll, nextSeed] = nextRandom(state.randomSeed);
  const attendanceVariance =
    definition.varianceMin + varianceRoll * (definition.varianceMax - definition.varianceMin);
  const outcome = getEventFunnelOutcome(state, definition, attendanceVariance);
  const reward = rollEventContactReward({ ...state, randomSeed: nextSeed }, definition);
  const isTutorialSparring = definitionId === "park-sparring" &&
    isGameAreaUnlocked("events", state) &&
    isTutorialScenePending(state, FIRST_EVENT_TUTORIAL_SCENE_ID);

  const contactReward = isTutorialSparring ? 1 : reward.amount;
  const demonstrationsGiven = Math.max(outcome.demonstrationsGiven, contactReward);
  const peopleMet = Math.max(outcome.peopleMet, demonstrationsGiven);
  const event: AcquisitionEvent = {
    id: makeGameId(
      "activity",
      now,
      getArchivedCompletedEventCount(state.historyArchive) + state.acquisitionEvents.length,
    ),
    definitionId,
    title: definition.title,
    location: definition.location,
    startedAt: now,
    resolvesAt: now + (isTutorialSparring
      ? GAME_CONFIG.tutorialSparringDurationMs
      : Math.round(definition.durationMs / (1 + masteryBonus))),
    cost: eventCost,
    peopleMet,
    demonstrationsGiven,
    contactReward,
    membersUsed: definition.requiredMembers,
    equipmentUsed: definition.requiredSwords,
    wearAdded: Math.max(
      0,
      Math.round(
        getPlannedEquipmentWear(
          state.upgrades,
          definition.wearAdded * GAME_CONFIG.eventWearMultiplier,
        ) *
          (1 - Math.min(
            GAME_CONFIG.equipmentMaximumEventMasteryWearReduction,
            masteryBonus,
          )),
      ),
    ),
    collaboratorId,
    status: "running",
    tutorialSceneId: isTutorialSparring
      ? FIRST_EVENT_TUTORIAL_SCENE_ID
      : undefined,
  };
  return {
    ...state,
    randomSeed: reward.nextSeed,
    school: { ...state.school, euros: state.school.euros - eventCost },
    equipment: reserveSwords(state.equipment, definition.requiredSwords) ?? state.equipment,
    acquisitionEvents: [...state.acquisitionEvents, event],
  };
}

export function cancelAutomatedEventForCollaborator(
  state: GameState,
  collaboratorId: string,
): GameState {
  const event = state.acquisitionEvents.find((candidate) =>
    candidate.status === "running" && candidate.collaboratorId === collaboratorId
  );
  if (!event) return state;

  return {
    ...state,
    school: { ...state.school, euros: state.school.euros + event.cost },
    equipment: completeEquipmentUse(
      state.equipment,
      event.equipmentUsed,
      event.wearAdded * 0.25,
    ),
    acquisitionEvents: state.acquisitionEvents.filter(
      (candidate) => candidate.id !== event.id,
    ),
  };
}

export function cancelAcquisitionEvent(
  state: GameState,
  eventId: string,
): GameState {
  const event = state.acquisitionEvents.find((candidate) =>
    candidate.id === eventId && candidate.status === "running"
  );
  if (!event) return state;

  return {
    ...state,
    school: { ...state.school, euros: state.school.euros + event.cost },
    equipment: completeEquipmentUse(
      state.equipment,
      event.equipmentUsed,
      event.wearAdded * 0.25,
    ),
    acquisitionEvents: state.acquisitionEvents.filter(
      (candidate) => candidate.id !== event.id,
    ),
  };
}

export function resolveAcquisitionEvent(
  state: GameState,
  event: AcquisitionEvent,
  now: number,
  gainMultiplier: number,
): GameState {
  if (event.status !== "running") return state;
  const source = event.definitionId === "organized-flyering" ? "sparring" : "event";
  const scaledReward = event.tutorialSceneId === FIRST_EVENT_TUTORIAL_SCENE_ID
    ? {
        state,
        amount: Math.max(
          GAME_CONFIG.tutorialSparringMinimumContacts,
          event.contactReward ?? 0,
        ),
      }
    : scaleContactGain(state, event.contactReward ?? 0, gainMultiplier);
  const rewardState = scaledReward.state;
  const contactReward = scaledReward.amount;
  const acquired = createAcquiredContacts(rewardState, contactReward, source, now);
  const contacts = acquired.contacts;
  const definition = getAcquisitionEventDefinition(event.definitionId);
  let nextState: GameState = {
    ...rewardState,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(rewardState.legendaryCollaborators, contacts),
    contacts: mergeAcquiredContacts(rewardState.contacts, contacts),
    equipment: completeEquipmentUse(
      rewardState.equipment,
      event.equipmentUsed ?? 0,
      event.wearAdded ?? 0,
    ),
    acquisitionEvents: rewardState.acquisitionEvents.map((candidate) =>
      candidate.id === event.id
        ? { ...candidate, contactReward, status: "completed" }
        : candidate,
    ),
    activities: definition
      ? {
          ...rewardState.activities,
          eventCooldowns: {
            ...rewardState.activities.eventCooldowns,
            [event.definitionId]: createEventCooldown(rewardState, definition, now),
          },
        }
      : rewardState.activities,
    statistics: {
      ...rewardState.statistics,
      contactsAcquired: rewardState.statistics.contactsAcquired + contacts.length,
      peopleMet: rewardState.statistics.peopleMet + event.peopleMet,
      demonstrationsGiven:
        rewardState.statistics.demonstrationsGiven + event.demonstrationsGiven,
      eventsCompleted: rewardState.statistics.eventsCompleted + 1,
    },
  };
  if (event.tutorialSceneId === FIRST_EVENT_TUTORIAL_SCENE_ID) {
    const selectedOutcomeId = nextState.pendingEmailOutcomes.find(
      (outcome) => outcome.tutorialSceneId === FIRST_EVENT_TUTORIAL_SCENE_ID,
    )?.id ?? nextState.pendingEmailOutcomes.find(
      (outcome) => outcome.waitForTutorialEvent,
    )?.id;
    nextState = {
      ...nextState,
      pendingEmailOutcomes: nextState.pendingEmailOutcomes.map((outcome) => {
        if (!outcome.waitForTutorialEvent) return outcome;
        if (outcome.id === selectedOutcomeId) {
          return {
              ...outcome,
              resolvesAt: now,
              result: "trialBooked",
              tutorialSceneId: FIRST_EVENT_TUTORIAL_SCENE_ID,
              waitForTutorialEvent: undefined,
            };
        }
        return outcome;
      }),
    };
  }
  if (contacts.length > 0) {
    nextState = addMessage(
      nextState,
      now,
      event.definitionId === "park-sparring"
        ? "Nuovi contatti dal volantinaggio"
        : event.definitionId === "organized-flyering"
          ? "Nuovi contatti dallo sparring"
          : "Contatti acquisiti alla dimostrazione",
      `${contacts.length} nuovi indirizzi sono disponibili per la campagna email.`,
      "positive",
      "other",
      "contacts",
    );
  }
  if (rewardState.statistics.eventsCompleted === 0) {
    nextState = addMessage(
      nextState,
      now + 1,
      "Attività operative disponibili",
      "Il primo evento ha attivato registro operativo, attrezzatura e traguardi. La nuova area è comparsa nella barra laterale.",
      "system",
    );
  }
  return contacts.length > 0 ? startNextCampaign(nextState, now) : nextState;
}
