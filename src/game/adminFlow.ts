import { addLegendaryEncounters, createAcquiredContacts, mergeAcquiredContacts } from "./contacts";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import { synchronizeEquipmentAvailability } from "./equipment";
import { startNextCampaign } from "./emailFlow";
import { getTrialDurationMs } from "../content/upgrades";
import { makeGameId } from "./ids";
import { getAvailableStandardLegendaryProfiles } from "./legendaryAvailability";
import { departMembers } from "./membershipFlow";
import { addToContactPool } from "./historyArchive";
import {
  addGroupedMembers,
  getGroupedMemberCount,
  removeGroupedMembers,
} from "./memberGroups";
import { nextRandom } from "./random";
import type { GameState, ScheduledTrial } from "./types";
import { unlockSocialIfEligible } from "./unlocks";
import { GADGET_PRODUCT_ORDER } from "../content/gadgets";
import { GADGET_RARITY_ORDER } from "../content/gadgetRarities";
import { createInitialGadgetMonthlyRevenueState } from "./gadgetRevenue";

export function addAdminContacts(state: GameState, rawAmount: number): GameState {
  const amount = Math.trunc(rawAmount);
  if (!Number.isSafeInteger(amount) || amount === 0) return state;

  if (amount > 0) {
    // Beyond the material limit the new contacts go straight into the pool (Fase 7.4).
    const material = Math.min(amount, GAME_CONFIG.materialAvailableContactsLimit);
    const acquired = createAcquiredContacts(state, material, "event", state.lastSavedAt);
    const pool = amount > material
      ? addToContactPool(state.availableContactPool, "event", "common", amount - material)
      : state.availableContactPool;
    return startNextCampaign({
      ...state,
      randomSeed: acquired.nextSeed,
      legendaryCollaborators: addLegendaryEncounters(
        state.legendaryCollaborators,
        acquired.contacts,
      ),
      availableContactPool: pool,
      contacts: mergeAcquiredContacts(state.contacts, acquired.contacts),
    }, state.lastSavedAt);
  }

  let remaining = Math.abs(amount);
  // Pooled contacts go first: they have no history to lose.
  const pool = [...(state.availableContactPool ?? [])];
  while (remaining > 0 && pool.length > 0) {
    const last = pool[pool.length - 1];
    const removed = Math.min(remaining, last.count);
    remaining -= removed;
    if (removed === last.count) pool.pop();
    else pool[pool.length - 1] = { ...last, count: last.count - removed };
  }
  const contacts = state.contacts.filter((contact) => {
    if (contact.status !== "available" || remaining === 0) return true;
    remaining -= 1;
    return false;
  });
  const poolChanged = pool.length !== (state.availableContactPool?.length ?? 0) ||
    pool.some((entry, index) => entry !== state.availableContactPool?.[index]);
  return contacts.length === state.contacts.length && !poolChanged
    ? state
    : { ...state, contacts, availableContactPool: pool.length > 0 ? pool : undefined };
}

export function addAdminMembers(state: GameState, rawAmount: number): GameState {
  const amount = Math.trunc(rawAmount);
  if (!Number.isSafeInteger(amount) || amount === 0) return state;

  const nextActiveMembers = Math.max(0, state.school.activeMembers + amount);
  const enrolledContacts = state.contacts.filter((contact) => contact.status === "enrolled");
  const groupedMembers = getGroupedMemberCount(state);
  const currentMembers = enrolledContacts.length + groupedMembers;
  let nextState = state;
  let resolvedActiveMembers = nextActiveMembers;

  if (currentMembers < nextActiveMembers) {
    const missingMembers = nextActiveMembers - currentMembers;
    // Beyond the material limit new members go straight into a group (Fase 7.5).
    const materialMembers = Math.min(missingMembers, GAME_CONFIG.materialEnrolledMembersLimit);
    const acquired = createAcquiredContacts(
      state,
      materialMembers,
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
    nextState = addGroupedMembers(nextState, {
      rarity: "common",
      source: "event",
      forms: [],
      enrolledMonth: state.school.currentMonth,
    }, missingMembers - materialMembers);
  } else if (currentMembers > nextActiveMembers) {
    const fromGroups = Math.min(groupedMembers, currentMembers - nextActiveMembers);
    const requestedDepartures = currentMembers - nextActiveMembers - fromGroups;
    const departingIds = requestedDepartures === 0 ? [] : enrolledContacts
      .filter((contact) => contact.rarity !== "legendary")
      .slice(-requestedDepartures)
      .map((contact) => contact.id);
    nextState = departMembers(
      removeGroupedMembers(state, fromGroups),
      departingIds,
      false,
      "data-reconciliation",
    );
    resolvedActiveMembers = nextState.contacts.filter(
      (contact) => contact.status === "enrolled",
    ).length + getGroupedMemberCount(nextState);
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

export function resetAdminGadgetSales(state: GameState): GameState {
  return {
    ...state,
    gadgets: {
      ...state.gadgets,
      products: Object.fromEntries(
        GADGET_PRODUCT_ORDER.map((productId) => {
          const product = state.gadgets.products[productId];
          return [
            productId,
            {
              ...product,
              rarities: Object.fromEntries(
                GADGET_RARITY_ORDER.map((rarity) => [
                  rarity,
                  {
                    ...product.rarities[rarity],
                    unitsSold: 0,
                    extraUnitsSold: 0,
                    salesRemainder: 0,
                  },
                ]),
              ) as typeof product.rarities,
            },
          ];
        }),
      ) as GameState["gadgets"]["products"],
      crossSellRemainder: 0,
      crossSellCursor: 0,
      monthlyRevenue: createInitialGadgetMonthlyRevenueState(
        state.school.currentMonth,
      ),
    },
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
