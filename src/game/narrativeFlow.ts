import { recordIncomeBySource } from "./membershipEconomy";
import { getFundsGainMultiplier } from "../content/upgrades";
import { getBusinessMultiplier } from "./reputation";
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
import { getSchoolYear } from "./calendar";
import type { Collaborator, Contact, FormTraining, GameState } from "./types";

/** Punti di usura di un Evento: percentuale della capacità di tutte le spade. */
export function getNarrativeWearPoints(state: GameState, wearPercent = 0): number {
  return Math.round(
    (wearPercent / 100) * state.equipment.totalSwords * GAME_CONFIG.equipmentBreakLoad,
  );
}

/** School year of the next end-of-June departures (June itself included). */
function getNextDepartureSchoolYear(currentMonth: number): number {
  const monthIndex = (Math.max(1, Math.floor(currentMonth)) - 1) % 12;
  return getSchoolYear(currentMonth + ((5 - monthIndex + 12) % 12));
}

/** «Il Mediatore» (20/10/2026): not twice in the same school year, nor in two years in a row. */
function canShieldDepartures(state: GameState): boolean {
  const last = state.narrative.mediatorSchoolYear;
  return last === undefined || getNextDepartureSchoolYear(state.school.currentMonth) >= last + 2;
}

function boostTraining(
  training: FormTraining | undefined,
  share: number,
  now: number,
): FormTraining | undefined {
  if (!training || training.status === "waitingForEquipment" || training.completesAt <= now) {
    return training;
  }
  const duration = Math.max(0, training.completesAt - training.startedAt);
  const shift = Math.round(duration * share);
  // Less than the boost left: done now, and the hidden exam is skipped (Andrea, 20/10/2026).
  if (training.completesAt - now <= shift) {
    return { ...training, startedAt: now - duration, completesAt: now, examWaived: true };
  }
  // Both ends move together, so the bar jumps forward by the share and keeps its length.
  return { ...training, startedAt: training.startedAt - shift, completesAt: training.completesAt - shift };
}

/** Every running course of every level (Forme, Istruttori, Tecnici, Agonisti) gains `percent`. */
export function boostRunningCourses(state: GameState, percent: number, now: number): GameState {
  const share = percent / 100;
  const boostContact = (contact: Contact): Contact => {
    const training = boostTraining(contact.training, share, now);
    return training === contact.training ? contact : { ...contact, training };
  };
  const boostCollaborator = (collaborator: Collaborator): Collaborator => {
    const training = boostTraining(collaborator.training, share, now);
    const instructorCourse = boostTraining(collaborator.instructorCourse, share, now);
    const technicianCourse = boostTraining(collaborator.technicianCourse, share, now);
    return training === collaborator.training &&
      instructorCourse === collaborator.instructorCourse &&
      technicianCourse === collaborator.technicianCourse
      ? collaborator
      : { ...collaborator, training, instructorCourse, technicianCourse };
  };
  return {
    ...state,
    contacts: state.contacts.map(boostContact),
    collaborators: state.collaborators.map(boostCollaborator),
  };
}

export function processNarrativeEvent(
  state: GameState,
  now: number,
  gainMultiplier: number,
): GameState {
  if (now < state.narrative.nextEventAt) return state;
  // Andrea 08/10: niente Eventi e Imprevisti sotto i 10 iscritti; il primo arriva entro 2 minuti dal decimo.
  if (state.school.activeMembers < GAME_CONFIG.narrativeEventMinMembers) {
    return {
      ...state,
      narrative: { ...state.narrative, nextEventAt: now + GAME_CONFIG.narrativeEventMinMs },
    };
  }
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
      (!blockNegative || definition.kind !== "negative") &&
      (definition.requiredLegendaries ?? []).every((id) =>
        state.legendaryCollaborators.enrolledProfileIds.includes(id)) &&
      (!definition.departureShield || canShieldDepartures(state)),
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
  // «Un procione in palestra»: ×2 at every visit, over the whole save.
  const factor = definition.doublesEveryTime ? 2 ** (state.network.raccoonVisits ?? 0) : 1;
  const contactDelta = (definition.contactDelta ?? 0) * factor;
  const wearPercent = definition.wearPercent ? definition.wearPercent * factor : undefined;
  const courseBoostPercent = definition.courseBoostPercent
    ? definition.courseBoostPercent * factor
    : undefined;
  const departureShieldYear = definition.departureShield
    ? getNextDepartureSchoolYear(state.school.currentMonth)
    : undefined;
  const rewardState = contactDelta
    ? scaleContactGain(
        { ...state, randomSeed: nextSeed },
        contactDelta,
        gainMultiplier,
      )
    : { state: { ...state, randomSeed: nextSeed }, amount: 0 };
  const acquired = rewardState.amount > 0
    ? createAcquiredContacts(rewardState.state, rewardState.amount, "collaborator", now)
    : { contacts: [], nextSeed: rewardState.state.randomSeed };
  const contacts = acquired.contacts;
  // The figures Andrea gave for the Leggendari's euros are paid as they are, without multipliers.
  const euroDelta = definition.eurosPerSchool
    ? definition.eurosPerSchool * (state.network.schoolCount + 1)
    : definition.doublesEveryTime
      ? (definition.euroDelta ?? 0) * factor
      : (definition.euroDelta ?? 0) > 0
        ? scaleCurrencyGain((definition.euroDelta ?? 0) * getBusinessMultiplier(state), gainMultiplier * getFundsGainMultiplier(state.upgrades))
        : (definition.euroDelta ?? 0);
  const baseSummary = euroDelta > 0
    ? `${definition.description} Contributo ricevuto: ${formatCurrency(euroDelta)}.`
    : definition.description;
  const wearDelta = getNarrativeWearPoints(state, wearPercent);
  const equipmentEffects = [
    wearPercent
      ? `${wearPercent > 0 ? "+" : ""}${wearPercent}% usura`
      : undefined,
    definition.damagedSwordsDelta
      ? `+${definition.damagedSwordsDelta} spada rotta`
      : undefined,
    definition.repairedSwordsDelta
      ? `${definition.repairedSwordsDelta} spada riparata`
      : undefined,
    courseBoostPercent ? `+${courseBoostPercent}% a tutti i corsi` : undefined,
    departureShieldYear !== undefined ? "nessun abbandono quest'anno" : undefined,
  ].filter(Boolean);
  const summary = equipmentEffects.length > 0
    ? `${baseSummary} Effetto: ${equipmentEffects.join(", ")}.`
    : baseSummary;
  const equipmentAfterLoad = applyEquipmentWear(
    rewardState.state.equipment,
    wearDelta,
  );
  const equipmentAfterDamage = applySwordDamage(
    equipmentAfterLoad,
    definition.damagedSwordsDelta ?? 0,
  );
  let nextState: GameState = {
    ...rewardState.state,
    network: definition.doublesEveryTime
      ? { ...rewardState.state.network, raccoonVisits: (state.network.raccoonVisits ?? 0) + 1 }
      : rewardState.state.network,
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
      ...rewardState.state.narrative,
      ...(departureShieldYear !== undefined ? { mediatorSchoolYear: departureShieldYear } : {}),
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
            wear: wearDelta || undefined,
            wearPercent,
            courseBoostPercent,
            departureShieldYear,
            damagedSwords: definition.damagedSwordsDelta,
            repairedSwords: definition.repairedSwordsDelta,
          },
        },
      ].slice(-GAME_CONFIG.narrativeHistoryLimit),
    },
    statistics: {
      ...recordIncomeBySource(rewardState.state.statistics, { events: Math.max(0, euroDelta) }),
      contactsAcquired: rewardState.state.statistics.contactsAcquired + contacts.length,
      narrativeEvents: rewardState.state.statistics.narrativeEvents + 1,
      eurosEarned: rewardState.state.statistics.eurosEarned + Math.max(0, euroDelta),
    },
  };
  if (courseBoostPercent) nextState = boostRunningCourses(nextState, courseBoostPercent, now);
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
    `${state.school.name} vince il Torneo Accademico. L'Ordine se ne accorge e il Network ti lascia aprire una nuova scuola: quando vuoi, la trovi nella nuova voce Network. Più aspetti, più Reputazione porti con te: un titolo al Nazionale, per dire, ne vale altri ${GAME_CONFIG.reputationNationalTitlePoints}.`,
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
