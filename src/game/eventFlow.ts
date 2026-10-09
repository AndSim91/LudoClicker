import { getAcquisitionEventDefinition, isAcquisitionEventUnlocked } from "../content/events";
import { getSpendableEuros } from "./debt";
import { sellGadgetsAtEvent } from "./gadgetFlow";
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
import { discoverSecretUpgrade } from "./upgradeFlow";
import {
  getBusyEventCollaboratorIds,
  getCollaboratorsById,
  getRunningEventCounts,
} from "./runtimeIndexes";
import { getEventCopyContactMultiplier, getEventExtraCopies } from "../content/upgrades";
import { isGameAreaUnlocked } from "./progression";
import {
  FIRST_EVENT_TUTORIAL_SCENE_ID,
  isTutorialScenePending,
} from "./tutorialProgress";
import type { AcquisitionEvent, Collaborator, GameState } from "./types";

export interface EventStartCheckContext {
  runningCounts: ReadonlyMap<AcquisitionEvent["definitionId"], number>;
  busyCollaboratorIds: ReadonlySet<string>;
  collaboratorsById: ReadonlyMap<string, Collaborator>;
  availableMembers: number;
  availableSwords: number;
}

export function createEventStartCheckContext(state: GameState): EventStartCheckContext {
  return {
    runningCounts: getRunningEventCounts(state.acquisitionEvents),
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
  if (!definition) return undefined;
  // Eventi nel Multiverso: up to 1 + extra copies of the same event at once.
  const runningCopies = checkContext.runningCounts.get(definitionId) ?? 0;
  if (runningCopies > getEventExtraCopies(state.upgrades)) return undefined;
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
    !isAcquisitionEventUnlocked(definition, state.school.fame, state.network.schoolCount) ||
    checkContext.availableMembers < definition.requiredMembers ||
    checkContext.availableSwords < definition.requiredSwords
  ) return undefined;

  const masteryDefinition = collaborator
    ? getCollaboratorMasteryDefinition(collaborator.mastery?.events ?? 0)
    : undefined;
  const eventCost = getEventCopyCost(
    Math.round(definition.cost * (masteryDefinition?.eventMultiplier ?? 1)),
    runningCopies,
  );
  if (getSpendableEuros(state) < eventCost) return undefined;
  return { definition, masteryDefinition, eventCost, runningCopies };
}

/** Each copy started while the event runs costs double the previous one: 50 → 100 → 200 €. */
export function getEventCopyCost(baseCost: number, runningCopies: number): number {
  return baseCost * 2 ** runningCopies;
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
  const { definition, masteryDefinition, eventCost, runningCopies } = details;
  const masteryEventMultiplier = masteryDefinition?.eventMultiplier ?? 1;

  const [varianceRoll, nextSeed] = nextRandom(state.randomSeed);
  const attendanceVariance =
    definition.varianceMin + varianceRoll * (definition.varianceMax - definition.varianceMin);
  const outcome = getEventFunnelOutcome(state, definition, attendanceVariance);
  const reward = rollEventContactReward({ ...state, randomSeed: nextSeed }, definition);
  const isTutorialSparring = definitionId === "park-sparring" &&
    isGameAreaUnlocked("events", state) &&
    isTutorialScenePending(state, FIRST_EVENT_TUTORIAL_SCENE_ID);

  // A copy finds fewer contacts; the fraction left becomes one more contact by chance.
  const [copyRoll, seedAfterCopy] = runningCopies > 0
    ? nextRandom(reward.nextSeed)
    : [0, reward.nextSeed];
  const copyContacts = reward.amount * getEventCopyContactMultiplier(runningCopies);
  const contactReward = isTutorialSparring
    ? 1
    : Math.floor(copyContacts) + (copyRoll < copyContacts % 1 ? 1 : 0);
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
      : Math.round(definition.durationMs * masteryEventMultiplier)),
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
          masteryEventMultiplier,
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
    randomSeed: seedAfterCopy,
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
        amount: GAME_CONFIG.tutorialSparringContacts,
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
    acquisitionEvents: rewardState.acquisitionEvents.filter(
      (candidate) => candidate.id !== event.id,
    ),
    historyArchive: {
      ...rewardState.historyArchive,
      completedEventsByDefinition: {
        ...rewardState.historyArchive.completedEventsByDefinition,
        [event.definitionId]:
          (rewardState.historyArchive.completedEventsByDefinition[event.definitionId] ?? 0) + 1,
      },
    },
    // The wait starts when the last copy of the event ends (Eventi nel Multiverso).
    activities: definition && !rewardState.acquisitionEvents.some((candidate) =>
      candidate.id !== event.id &&
      candidate.status === "running" &&
      candidate.definitionId === event.definitionId
    )
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
  if (event.collaboratorId) nextState = sellGadgetsAtEvent(nextState, event.peopleMet, now);
  // 09/10/2026: the tutorial flyering no longer books a trial on the spot. Email
  // replies wait for the whole Events tutorial and start counting when it ends
  // (finishTutorialScene).
  // 4.1: acquired contacts are counted in the yearly digest.
  if (rewardState.statistics.eventsCompleted === 0) {
    nextState = addMessage(
      nextState,
      now + 1,
      "Primo evento archiviato",
      "Le spade tornano alla fine di un evento, ma non sempre intere. Tienile d'occhio!",
      "system",
    );
  }
  // The secret hint («forze più grandi…») points here: surviving R'lyeh reveals ToccoDiGilo.
  if (event.definitionId === "cthulhu-challenge" && !nextState.secretUpgradeDiscoveries.includes("divine-touch")) {
    nextState = addMessage(
      discoverSecretUpgrade(nextState, "divine-touch"),
      now + 2,
      "Percorso Segreto: ToccoDiGilo",
      "Da R'lyeh si torna con qualcosa in più: negli Upgrade compare ToccoDiGilo.",
      "positive",
      "focused",
      "progress",
    );
  }
  return contacts.length > 0 ? startNextCampaign(nextState, now) : nextState;
}
