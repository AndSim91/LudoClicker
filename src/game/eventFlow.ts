import { getAcquisitionEventDefinition } from "../content/events";
import {
  COLLABORATOR_MASTERY_XP,
  getCollaboratorMasteryDefinition,
} from "../content/mastery";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import {
  applyEquipmentWear,
  getAvailableSwords,
  synchronizeEquipmentAvailability,
} from "./equipment";
import { scaleContactGain } from "./economy";
import { getEventFunnelOutcome } from "./formulas";
import { createAcquiredContacts, addLegendaryEncounters } from "./contacts";
import { makeGameId } from "./ids";
import { nextRandom } from "./random";
import {
  addCollaboratorMasteryExperienceForCollaborator,
  addMessage,
} from "./stateUpdates";
import { selectAvailableEventMembers } from "./selectors";
import { startNextCampaign } from "./emailFlow";
import { getArchivedCompletedEventCount } from "./historyArchive";
import type { AcquisitionEvent, GameState } from "./types";

export function startAcquisitionEvent(
  state: GameState,
  definitionId: AcquisitionEvent["definitionId"],
  now: number,
  collaboratorId?: string,
): GameState {
  const definition = getAcquisitionEventDefinition(definitionId);
  if (!definition) return state;
  if (state.acquisitionEvents.some((event) =>
    event.status === "running" && event.definitionId === definitionId
  )) return state;
  const collaborator = collaboratorId
    ? state.collaborators.find((candidate) =>
      candidate.id === collaboratorId && candidate.assignment === "events"
    )
    : undefined;
  if (collaboratorId) {
    if (
      !collaborator ||
      state.acquisitionEvents.some((event) =>
        event.status === "running" && event.collaboratorId === collaboratorId
      )
    ) return state;
  }
  if (definitionId === "park-sparring" && now < state.activities.nextSparringAt) return state;
  if (state.school.peakActiveMembers < definition.unlockMembers) return state;
  if (selectAvailableEventMembers(state) < definition.requiredMembers) return state;
  const availableSwords = getAvailableSwords(state.equipment);
  if (availableSwords < definition.requiredSwords) return state;
  const masteryBonus = collaborator
    ? getCollaboratorMasteryDefinition(collaborator.mastery?.events ?? 0).multiplier
    : 0;
  const eventCost = Math.round(definition.cost * (1 - masteryBonus));
  if (state.school.euros < eventCost) return state;

  const [varianceRoll, nextSeed] = nextRandom(state.randomSeed);
  const attendanceVariance =
    definition.varianceMin + varianceRoll * (definition.varianceMax - definition.varianceMin);
  const outcome = getEventFunnelOutcome(state, definition, attendanceVariance);

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
    resolvesAt: now + Math.round(definition.durationMs / (1 + masteryBonus)),
    cost: eventCost,
    peopleMet: outcome.peopleMet,
    demonstrationsGiven: outcome.demonstrationsGiven,
    contactReward: outcome.contactsObtained,
    membersUsed: definition.requiredMembers,
    equipmentUsed: definition.requiredSwords,
    wearAdded: Math.max(
      0,
      Math.round(
        definition.wearAdded *
          GAME_CONFIG.eventWearMultiplier *
          (1 - Math.min(0.8, getUpgradeEffectTotal(state.upgrades, "equipmentWearReduction"))) *
          (1 - masteryBonus),
      ),
    ),
    collaboratorId,
    status: "running",
  };
  return {
    ...state,
    randomSeed: nextSeed,
    school: { ...state.school, euros: state.school.euros - eventCost },
    equipment: {
      ...state.equipment,
      availableSwords: availableSwords - definition.requiredSwords,
    },
    acquisitionEvents: [...state.acquisitionEvents, event],
    activities: {
      ...state.activities,
      nextSparringAt:
        definitionId === "park-sparring"
          ? event.resolvesAt + GAME_CONFIG.sparringCooldownMs
          : state.activities.nextSparringAt,
    },
  };
}

export function cancelAutomatedEventForCollaborator(
  state: GameState,
  collaboratorId: string,
  now: number,
): GameState {
  const event = state.acquisitionEvents.find((candidate) =>
    candidate.status === "running" && candidate.collaboratorId === collaboratorId
  );
  if (!event) return state;

  return {
    ...state,
    school: { ...state.school, euros: state.school.euros + event.cost },
    equipment: synchronizeEquipmentAvailability({
      ...state.equipment,
      availableSwords: state.equipment.availableSwords + event.equipmentUsed,
    }),
    acquisitionEvents: state.acquisitionEvents.filter(
      (candidate) => candidate.id !== event.id,
    ),
    activities: event.definitionId === "park-sparring"
      ? { ...state.activities, nextSparringAt: now }
      : state.activities,
  };
}

export function resolveAcquisitionEvent(
  state: GameState,
  event: AcquisitionEvent,
  now: number,
  gainMultiplier: number,
): GameState {
  if (event.status !== "running") return state;
  const source = event.definitionId === "park-sparring" ? "sparring" : "event";
  const scaledReward = scaleContactGain(state, event.contactReward ?? 0, gainMultiplier);
  const rewardState = scaledReward.state;
  const contactReward = scaledReward.amount;
  const acquired = createAcquiredContacts(rewardState, contactReward, source, now);
  const contacts = acquired.contacts;
  let nextState: GameState = {
    ...rewardState,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(rewardState.legendaryCollaborators, contacts),
    contacts: [...rewardState.contacts, ...contacts],
    equipment: applyEquipmentWear(
      {
        ...rewardState.equipment,
        availableSwords: Math.min(
          rewardState.equipment.totalSwords,
          rewardState.equipment.availableSwords + (event.equipmentUsed ?? 0),
        ),
      },
      event.wearAdded ?? 0,
    ),
    acquisitionEvents: rewardState.acquisitionEvents.map((candidate) =>
      candidate.id === event.id
        ? { ...candidate, contactReward, status: "completed" }
        : candidate,
    ),
    statistics: {
      ...rewardState.statistics,
      contactsAcquired: rewardState.statistics.contactsAcquired + contacts.length,
      peopleMet: rewardState.statistics.peopleMet + event.peopleMet,
      demonstrationsGiven:
        rewardState.statistics.demonstrationsGiven + event.demonstrationsGiven,
      eventsCompleted: rewardState.statistics.eventsCompleted + 1,
    },
  };
  if (event.collaboratorId) {
    nextState = addCollaboratorMasteryExperienceForCollaborator(
      nextState,
      event.collaboratorId,
      "events",
      COLLABORATOR_MASTERY_XP.eventCompleted,
      now,
    );
  }
  if (contacts.length > 0) {
    nextState = addMessage(
      nextState,
      now,
      event.definitionId === "park-sparring"
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
