import { NARRATIVE_EVENTS } from "../content/narrativeEvents";
import { formatCurrency } from "../shared/formatters";
import { addLegendaryEncounters, createAcquiredContacts } from "./contacts";
import { GAME_CONFIG } from "./config";
import { scaleContactGain, scaleCurrencyGain } from "./economy";
import { startNextCampaign } from "./emailFlow";
import { applyEquipmentWear, applySwordDamage } from "./equipment";
import { makeGameId } from "./ids";
import { departMembers } from "./membershipFlow";
import { canFoundSchool } from "./progression";
import { nextRandom, randomBetween } from "./random";
import { addMessage } from "./stateUpdates";
import type { GameState } from "./types";

export function processNarrativeEvent(
  state: GameState,
  now: number,
  gainMultiplier: number,
): GameState {
  if (now < state.narrative.nextEventAt || state.school.activeMembers <= 0) return state;
  const recentKinds = state.narrative.history.slice(-2).map((record) =>
    NARRATIVE_EVENTS.find((definition) => definition.id === record.definitionId)?.kind,
  );
  const blockNegative = recentKinds.length === 2 &&
    recentKinds.every((kind) => kind === "negative");
  const eligible = NARRATIVE_EVENTS.filter(
    (definition) => state.school.activeMembers >= definition.minMembers &&
      (!blockNegative || definition.kind !== "negative"),
  );
  if (eligible.length === 0) return state;
  const [eventRoll, seedAfterEvent] = nextRandom(state.randomSeed);
  const definition = eligible[
    Math.min(eligible.length - 1, Math.floor(eventRoll * eligible.length))
  ];
  const [nextDelay, nextSeed] = randomBetween(
    seedAfterEvent,
    GAME_CONFIG.narrativeEventMinMs,
    GAME_CONFIG.narrativeEventMaxMs,
  );
  const rewardState = definition.contactDelta
    ? scaleContactGain(
        { ...state, randomSeed: nextSeed },
        definition.contactDelta,
        gainMultiplier,
      )
    : { state: { ...state, randomSeed: nextSeed }, amount: 0 };
  const acquired = rewardState.amount > 0
    ? createAcquiredContacts(rewardState.state, rewardState.amount, "collaborator", now)
    : { contacts: [], nextSeed: rewardState.state.randomSeed };
  const contacts = acquired.contacts;
  const enrolledMembers = state.contacts.filter((contact) => contact.status === "enrolled");
  const renewalMember = definition.id === "missed-renewal" && enrolledMembers.length > 0
    ? enrolledMembers[
        Math.min(enrolledMembers.length - 1, Math.floor(eventRoll * enrolledMembers.length))
      ]
    : undefined;
  const euroDelta = (definition.euroDelta ?? 0) > 0
    ? scaleCurrencyGain(definition.euroDelta ?? 0, gainMultiplier)
    : (definition.euroDelta ?? 0);
  const summary = definition.euroDelta && definition.euroDelta > 0
    ? `${definition.description} Contributo ricevuto: ${formatCurrency(euroDelta)}.`
    : definition.description;
  let nextState: GameState = {
    ...rewardState.state,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(
      rewardState.state.legendaryCollaborators,
      contacts,
    ),
    school: {
      ...rewardState.state.school,
      activeMembers: Math.max(
        0,
        rewardState.state.school.activeMembers +
          (renewalMember ? 0 : (definition.memberDelta ?? 0)),
      ),
      euros: Math.max(0, rewardState.state.school.euros + euroDelta),
    },
    equipment: applySwordDamage(
      applyEquipmentWear(rewardState.state.equipment, definition.wearDelta ?? 0),
      definition.damagedSwordsDelta ?? 0,
    ),
    contacts: [...rewardState.state.contacts, ...contacts],
    narrative: {
      nextEventAt: now + nextDelay,
      history: [
        ...rewardState.state.narrative.history,
        {
          id: makeGameId("narrative", now, state.narrative.history.length),
          definitionId: definition.id,
          title: definition.title,
          occurredAt: now,
          summary,
          ...(renewalMember
            ? {
                person: {
                  displayName: `${renewalMember.firstName} ${renewalMember.lastName}`,
                  rarity: renewalMember.rarity,
                },
              }
            : {}),
        },
      ].slice(-GAME_CONFIG.narrativeHistoryLimit),
    },
    statistics: {
      ...rewardState.state.statistics,
      contactsAcquired: rewardState.state.statistics.contactsAcquired + contacts.length,
      narrativeEvents: rewardState.state.statistics.narrativeEvents + 1,
      eurosEarned: rewardState.state.statistics.eurosEarned + Math.max(0, euroDelta),
    },
  };
  if (renewalMember) {
    nextState = departMembers(nextState, [renewalMember.id]);
  }
  nextState = addMessage(
    nextState,
    now,
    definition.title,
    summary,
    definition.tone,
    "other",
    "narrative",
  );
  return contacts.length > 0 ? startNextCampaign(nextState, now) : nextState;
}

export function notifyPrestigeOffer(state: GameState, now: number): GameState {
  if (!canFoundSchool(state) || state.network.prestigeOfferSent) return state;
  const ready: GameState = {
    ...state,
    network: { ...state.network, prestigeOfferSent: true },
  };
  return addMessage(
    ready,
    now,
    "Richiesta apertura nuova scuola",
    "La rete ha approvato la fondazione di una nuova sede. Completa la procedura nelle Impostazioni quando desideri trasferirti.",
    "system",
  );
}
