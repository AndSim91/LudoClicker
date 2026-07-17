import { addLegendaryEncounters, createAcquiredContacts } from "./contacts";
import { roundCurrency } from "./economy";
import { startNextCampaign } from "./emailFlow";
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
  const historicMembers = amount > 0
    ? state.school.historicMembers + amount
    : state.school.historicMembers;
  if (!Number.isSafeInteger(nextActiveMembers) || !Number.isSafeInteger(historicMembers)) {
    return state;
  }

  return {
    ...state,
    school: {
      ...state.school,
      activeMembers: nextActiveMembers,
      peakActiveMembers: Math.max(state.school.peakActiveMembers, nextActiveMembers),
      historicMembers,
    },
    unlocks: {
      ...state.unlocks,
      upgrades: amount > 0 ? true : state.unlocks.upgrades,
      social: amount > 0 && hasSocialMemberRequirement(nextActiveMembers)
        ? true
        : state.unlocks.social,
      forms: amount > 0 ? true : state.unlocks.forms,
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
