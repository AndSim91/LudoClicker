import { getAvailableSwords, reserveSwords } from "./equipment";
import { incrementLegendaryPity } from "./legendaryPity";
import {
  getCompletedTrialsByMostRecent,
  getContactsById,
  getScheduledTrialsByStart,
} from "./runtimeIndexes";
import {
  isTrialEnrollmentGuaranteed,
  type TrialEnrollmentGuaranteeContext,
} from "./trialEnrollment";
import { resolveStartedTrialBatch } from "./trialResolution";
import type { Contact, GameState, ScheduledTrial } from "./types";

export { getLegendaryEnrollmentChance } from "./trialEnrollment";

export function processScheduledTrialStarts(
  state: GameState,
  now: number,
  maxStarts = Infinity,
): GameState {
  const startLimit = Number.isFinite(maxStarts)
    ? Math.max(0, Math.floor(maxStarts))
    : Infinity;
  const trialsToStart = getScheduledTrialsByStart(state.scheduledTrials)
    .filter(
      (trial) =>
        trial.equipmentUsed === undefined && trial.startsAt <= now,
    )
    .slice(0, startLimit);
  if (trialsToStart.length === 0) return state;

  // Le decisioni restano sequenziali; gli elenchi vengono ricopiati una sola volta al commit.
  const trialUpdates = new Map<string, ScheduledTrial>();
  const contactUpdates = new Map<string, Contact>();
  let contactsById: Map<string, Contact> | undefined;
  let recentTrials: readonly ScheduledTrial[] | undefined;
  let availableSwords = Math.floor(getAvailableSwords(state.equipment));
  let reservedSwordsCount = 0;
  let cancelledTrialsCount = 0;
  let legendaryPity = state.legendaryPity;
  let secretLegendaries = state.network.secretLegendaries;

  const getGuaranteeContext = (): TrialEnrollmentGuaranteeContext => {
    contactsById ??= new Map(getContactsById(state.contacts));
    recentTrials ??= getCompletedTrialsByMostRecent(state.scheduledTrials);
    return { contactsById, recentTrials, legendaryPity };
  };

  for (const trial of trialsToStart) {
    if (availableSwords > 0) {
      availableSwords -= 1;
      reservedSwordsCount += 1;
      trialUpdates.set(trial.id, { ...trial, equipmentUsed: 1 });
      continue;
    }

    if (isTrialEnrollmentGuaranteed(state, trial, getGuaranteeContext())) {
      trialUpdates.set(trial.id, { ...trial, equipmentUsed: 0 });
      continue;
    }

    trialUpdates.set(trial.id, {
      ...trial,
      status: "cancelled",
      cancellationReason: "equipment",
    });
    cancelledTrialsCount += 1;
    legendaryPity = incrementLegendaryPity(legendaryPity);

    const mutableContactsById = contactsById;
    const contact = mutableContactsById?.get(trial.contactId);
    if (contact && mutableContactsById) {
      const lostContact: Contact = { ...contact, status: "lost" };
      mutableContactsById.set(contact.id, lostContact);
      contactUpdates.set(contact.id, lostContact);
    }

    const secretProgress = trial.secretLegendaryId
      ? secretLegendaries[trial.secretLegendaryId]
      : undefined;
    if (trial.secretLegendaryId && secretProgress) {
      if (secretLegendaries === state.network.secretLegendaries) {
        secretLegendaries = { ...secretLegendaries };
      }
      secretLegendaries[trial.secretLegendaryId] = {
        ...secretProgress,
        status: "external",
      };
    }
  }

  const equipment =
    reservedSwordsCount > 0
      ? (reserveSwords(state.equipment, reservedSwordsCount) ?? state.equipment)
      : state.equipment;
  return {
    ...state,
    equipment,
    scheduledTrials: state.scheduledTrials.map((trial) => trialUpdates.get(trial.id) ?? trial),
    contacts:
      contactUpdates.size > 0
        ? state.contacts.map((contact) => contactUpdates.get(contact.id) ?? contact)
        : state.contacts,
    statistics:
      cancelledTrialsCount > 0
        ? {
            ...state.statistics,
            contactsLost: state.statistics.contactsLost + cancelledTrialsCount,
          }
        : state.statistics,
    legendaryPity,
    network:
      secretLegendaries === state.network.secretLegendaries
        ? state.network
        : { ...state.network, secretLegendaries },
  };
}

export function resolveTrial(
  state: GameState,
  trial: ScheduledTrial,
  now: number,
  gainMultiplier: number,
): GameState {
  if (trial.status !== "scheduled") return state;
  const startedState = trial.equipmentUsed === undefined
    ? processScheduledTrialStarts(state, now)
    : state;
  return resolveStartedTrialBatch(startedState, [trial], now, gainMultiplier);
}

export function resolveTrialBatch(
  state: GameState,
  trials: readonly ScheduledTrial[],
  now: number,
  gainMultiplier: number,
): GameState {
  if (!trials.some((trial) => trial.status === "scheduled")) return state;
  const startedState = trials.some(
    (trial) => trial.status === "scheduled" && trial.equipmentUsed === undefined,
  )
    ? processScheduledTrialStarts(state, now)
    : state;
  return resolveStartedTrialBatch(startedState, trials, now, gainMultiplier);
}
