import { noteNarrativeEvent } from "./yearDigest";
import { NARRATIVE_EVENTS } from "../content/narrativeEvents";
import { formatCurrency } from "../shared/formatters";
import { addLegendaryEncounters, createAcquiredContacts, mergeAcquiredContacts } from "./contacts";
import { GAME_CONFIG } from "./config";
import { scaleContactGain, scaleCurrencyGain } from "./economy";
import { startNextCampaign } from "./emailFlow";
import {
  applyEquipmentWear,
  applySwordDamage,
  repairDamagedSwords,
} from "./equipment";
import { makeGameId } from "./ids";
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
  const recentKinds = state.narrative.history
    .slice(-GAME_CONFIG.narrativeNegativeStreakLimit)
    .map((record) =>
      NARRATIVE_EVENTS.find((definition) => definition.id === record.definitionId)?.kind,
    );
  const blockNegative = recentKinds.length === GAME_CONFIG.narrativeNegativeStreakLimit &&
    recentKinds.every((kind) => kind === "negative");
  const eligible = NARRATIVE_EVENTS.filter(
    (definition) => state.school.activeMembers >= definition.minMembers &&
      !definition.scripted &&
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
  const euroDelta = (definition.euroDelta ?? 0) > 0
    ? scaleCurrencyGain(definition.euroDelta ?? 0, gainMultiplier)
    : (definition.euroDelta ?? 0);
  const baseSummary = definition.euroDelta && definition.euroDelta > 0
    ? `${definition.description} Contributo ricevuto: ${formatCurrency(euroDelta)}.`
    : definition.description;
  const equipmentEffects = [
    definition.wearDelta
      ? `${definition.wearDelta > 0 ? "+" : ""}${definition.wearDelta} usura`
      : undefined,
    definition.damagedSwordsDelta
      ? `+${definition.damagedSwordsDelta} spada rotta`
      : undefined,
    definition.repairedSwordsDelta
      ? `${definition.repairedSwordsDelta} spada riparata`
      : undefined,
  ].filter(Boolean);
  const summary = equipmentEffects.length > 0
    ? `${baseSummary} Effetto: ${equipmentEffects.join(", ")}.`
    : baseSummary;
  const equipmentAfterLoad = applyEquipmentWear(
    rewardState.state.equipment,
    definition.wearDelta ?? 0,
  );
  const equipmentAfterDamage = applySwordDamage(
    equipmentAfterLoad,
    definition.damagedSwordsDelta ?? 0,
  );
  let nextState: GameState = {
    ...rewardState.state,
    randomSeed: acquired.nextSeed,
    legendaryCollaborators: addLegendaryEncounters(
      rewardState.state.legendaryCollaborators,
      contacts,
    ),
    school: {
      ...rewardState.state.school,
      euros: Math.max(0, rewardState.state.school.euros + euroDelta),
    },
    equipment: repairDamagedSwords(
      equipmentAfterDamage,
      definition.repairedSwordsDelta ?? 0,
    ),
    contacts: mergeAcquiredContacts(rewardState.state.contacts, contacts),
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
          effects: {
            contacts: contacts.length || undefined,
            euros: euroDelta || undefined,
            wear: definition.wearDelta,
            damagedSwords: definition.damagedSwordsDelta,
            repairedSwords: definition.repairedSwordsDelta,
          },
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
  nextState = noteNarrativeEvent(nextState, definition.title);
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
    "Primi all'Accademico",
    `${state.school.name} vince il Torneo Accademico. L'Ordine se ne accorge e la Rete ti lascia aprire una nuova scuola: quando vuoi, la trovi nella nuova voce Rete. Più aspetti, più Reputazione porti con te: un titolo al Nazionale, per dire, ne vale altri ${GAME_CONFIG.reputationNationalTitlePoints}.`,
    "system",
  );
}

export function announceMembershipFeeTier(state: GameState, now: number): GameState {
  const tiers = GAME_CONFIG.membershipFeeTiers;
  const reached = tiers.filter((tier) => state.school.peakActiveMembers >= tier.members).length;
  if (reached <= (state.school.feeTiersAnnounced ?? 0)) return state;
  const tier = tiers[reached - 1];
  const next = tiers[reached];
  return addMessage(
    { ...state, school: { ...state.school, feeTiersAnnounced: reached } },
    now,
    `Quota mensile: ${tier.fee} €`,
    `${tier.members.toLocaleString("it-IT")} iscritti: da questo mese ognuno paga ${tier.fee} €, e indietro non si torna.${next ? ` Prossimo scalino a ${next.members.toLocaleString("it-IT")}.` : " È la quota più alta dell'Ordine."}`,
    "positive",
    "focused",
    "progress",
  );
}
