import { addLegendaryEncounters, createAcquiredContacts } from "./contacts";
import { roundCurrency } from "./economy";
import { startNextCampaign } from "./emailFlow";
import { departMembers } from "./membershipFlow";
import type { GameState } from "./types";
import { hasSocialMemberRequirement } from "./unlocks";

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
      contacts: [...state.contacts, ...acquired.contacts],
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
      contacts: [...state.contacts, ...newMembers],
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
    const departingIds = enrolledContacts
      .slice(nextActiveMembers)
      .map((contact) => contact.id);
    nextState = departMembers(state, departingIds, false);
    nextState = {
      ...nextState,
      statistics: state.statistics,
    };
  }

  const historicMembers = amount > 0
    ? Math.max(state.school.historicMembers + amount, nextActiveMembers)
    : Math.max(state.school.historicMembers, nextActiveMembers);
  if (!Number.isSafeInteger(nextActiveMembers) || !Number.isSafeInteger(historicMembers)) {
    return state;
  }

  return {
    ...nextState,
    school: {
      ...nextState.school,
      activeMembers: nextActiveMembers,
      peakActiveMembers: Math.max(nextState.school.peakActiveMembers, nextActiveMembers),
      historicMembers,
    },
    unlocks: {
      ...nextState.unlocks,
      upgrades: amount > 0 ? true : nextState.unlocks.upgrades,
      social: amount > 0 && hasSocialMemberRequirement(nextActiveMembers)
        ? true
        : nextState.unlocks.social,
      forms: amount > 0 ? true : nextState.unlocks.forms,
    },
  };
}

export function addAdminEuros(state: GameState, amount: number): GameState {
  if (!Number.isFinite(amount) || amount === 0) return state;
  const euros = Math.max(0, roundCurrency(state.school.euros + amount));
  return Number.isFinite(euros)
    ? { ...state, school: { ...state.school, euros } }
    : state;
}
