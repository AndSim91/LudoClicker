import { addLegendaryEncounters, createAcquiredContacts, mergeAcquiredContacts } from "./contacts";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import { synchronizeEquipmentAvailability } from "./equipment";
import { startNextCampaign } from "./emailFlow";
import { getTrialDurationMs } from "../content/upgrades";
import { makeGameId } from "./ids";
import { getAvailableStandardLegendaryProfiles } from "./legendaryAvailability";
import { departMembers } from "./membershipFlow";
import { nextRandom } from "./random";
import type { GameState, ScheduledTrial } from "./types";
import { unlockSocialIfEligible } from "./unlocks";

export function addAdminContacts(state: GameState, rawAmount: number): GameState {
  const amount = Math.trunc(rawAmount);
  if (!Number.isSafeInteger(amount) || amount === 0) return state;

  if (amount > 0) {
    const acquired = createAcquiredContacts(state, amount, "event", state.lastSavedAt);
    return startNextCampaign({
      ...state,
      randomSeed: acquired.nextSeed,
      legendaryCollaborators: addLegendaryEncounters(
        state.legendaryCollaborators,
        acquired.contacts,
      ),
      contacts: mergeAcquiredContacts(state.contacts, acquired.contacts),
    }, state.lastSavedAt);
  }

  let remaining = Math.abs(amount);
  const contacts = state.contacts.filter((contact) => {
    if (contact.status !== "available" || remaining === 0) return true;
    remaining -= 1;
    return false;
  });
  return contacts.length === state.contacts.length ? state : { ...state, contacts };
}

export function addAdminMembers(state: GameState, rawAmount: number): GameState {
  const amount = Math.trunc(rawAmount);
  if (!Number.isSafeInteger(amount) || amount === 0) return state;

  const nextActiveMembers = Math.max(0, state.school.activeMembers + amount);
  const enrolledContacts = state.contacts.filter((contact) => contact.status === "enrolled");
  let nextState = state;
  let resolvedActiveMembers = nextActiveMembers;

  if (enrolledContacts.length < nextActiveMembers) {
    const missingMembers = nextActiveMembers - enrolledContacts.length;
    const acquired = createAcquiredContacts(
      state,
      missingMembers,
      "event",
      state.lastSavedAt,
    );
    const newMembers = acquired.contacts.map((contact) => ({
      ...contact,
      status: "enrolled" as const,
      enrolledMonth: state.school.currentMonth,
    }));
    const enrolledProfileIds = newMembers.flatMap((contact) =>
      contact.specialProfileId ? [contact.specialProfileId] : [],
    );
    nextState = {
      ...state,
      randomSeed: acquired.nextSeed,
      contacts: mergeAcquiredContacts(state.contacts, newMembers),
      legendaryCollaborators: {
        ...addLegendaryEncounters(state.legendaryCollaborators, newMembers),
        enrolledProfileIds: [
          ...new Set([
            ...state.legendaryCollaborators.enrolledProfileIds,
            ...enrolledProfileIds,
          ]),
        ],
      },
    };
  } else if (enrolledContacts.length > nextActiveMembers) {
    const requestedDepartures = enrolledContacts.length - nextActiveMembers;
    const departingIds = enrolledContacts
      .filter((contact) => contact.rarity !== "legendary")
      .slice(-requestedDepartures)
      .map((contact) => contact.id);
    nextState = departMembers(state, departingIds, false, "data-reconciliation");
    resolvedActiveMembers = nextState.contacts.filter(
      (contact) => contact.status === "enrolled",
    ).length;
    nextState = {
      ...nextState,
      statistics: state.statistics,
    };
  }

  const fame = amount > 0
    ? Math.max(state.school.fame + amount, resolvedActiveMembers)
    : Math.max(state.school.fame, resolvedActiveMembers);
  if (!Number.isSafeInteger(resolvedActiveMembers) || !Number.isSafeInteger(fame)) {
    return state;
  }

  const updatedState: GameState = {
    ...nextState,
    school: {
      ...nextState.school,
      activeMembers: resolvedActiveMembers,
      peakActiveMembers: Math.max(nextState.school.peakActiveMembers, resolvedActiveMembers),
      fame,
    },
    unlocks: {
      ...nextState.unlocks,
      upgrades: amount > 0 ? true : nextState.unlocks.upgrades,
      forms: amount > 0 ? true : nextState.unlocks.forms,
    },
  };
  return amount > 0 ? unlockSocialIfEligible(updatedState) : updatedState;
}

export function addAdminEuros(state: GameState, amount: number): GameState {
  if (!Number.isFinite(amount) || amount === 0) return state;
  const euros = Math.max(0, roundCurrency(state.school.euros + amount));
  return Number.isFinite(euros)
    ? { ...state, school: { ...state.school, euros } }
    : state;
}

export function addAdminSwords(state: GameState, rawAmount: number): GameState {
  const amount = Math.trunc(rawAmount);
  if (!Number.isSafeInteger(amount) || amount === 0) return state;

  const totalSwords = state.equipment.totalSwords + amount;
  const availableSwords = state.equipment.availableSwords + amount;
  if (!Number.isSafeInteger(totalSwords) || !Number.isSafeInteger(availableSwords)) {
    return state;
  }

  return {
    ...state,
    equipment: synchronizeEquipmentAvailability({
      ...state.equipment,
      totalSwords,
      availableSwords,
    }),
  };
}

export function scheduleAdminLegendaryTrial(state: GameState, now: number): GameState {
  if (
    !Number.isFinite(now) ||
    getAvailableStandardLegendaryProfiles(state, now).length === 0
  ) {
    return state;
  }

  const acquired = createAcquiredContacts(
    state,
    1,
    "event",
    now,
    { forcedRarity: "legendary" },
  );
  const contact = acquired.contacts[0];
  if (!contact?.specialProfileId || contact.rarity !== "legendary") return state;

  const [resultRoll, nextSeed] = nextRandom(acquired.nextSeed);
  const trial: ScheduledTrial = {
    id: makeGameId(
      "trial",
      now,
      state.historyArchive.completedTrials + state.scheduledTrials.length,
    ),
    contactId: contact.id,
    startsAt: now,
    resolvesAt: now + getTrialDurationMs(state.upgrades, GAME_CONFIG.trialDurationMs),
    resultSeed: Math.floor(resultRoll * 2_147_483_647),
    status: "scheduled",
  };

  return {
    ...state,
    randomSeed: nextSeed,
    legendaryCollaborators: addLegendaryEncounters(
      state.legendaryCollaborators,
      acquired.contacts,
    ),
    contacts: mergeAcquiredContacts(
      state.contacts,
      [{ ...contact, status: "trialScheduled" }],
    ),
    scheduledTrials: [...state.scheduledTrials, trial],
    statistics: {
      ...state.statistics,
      trialsBooked: state.statistics.trialsBooked + 1,
    },
  };
}
