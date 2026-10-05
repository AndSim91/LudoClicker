import { nextRandom } from "./random";
import { GAME_CONFIG } from "./config";
import { getCalendarMonth } from "./calendar";
import type { GameState, LightInflationState } from "./types";

export const LIGHT_INFLATION_CAUSES = [
  "del finanziamento della Guerra contro il caro prezzi",
  "del finanziamento della crisi di governo in ONBOARD Italia",
  "della ricostruzione post disastro dei Novizi",
  "della ricostruzione post alluvione nel magazzino",
  "della ricostruzione post terremoto del Sisma a Torino",
  "del finanziamento della missione di pace a Milano",
  "del rinnovo del contratto degli insegnanti",
  "dell'acquisto di spade ecologiche",
  "del finanziamento della cultura della scherma",
  "della gestione dell'emergenza immigrazione tra Accademie",
  'delle coperture del Decreto "Salva LudoSport"',
  'del finanziamento del "Bonus Gestori di Spade Laser"',
  'delle coperture del Decreto "Farebbi" per il sistema formativo',
  "della copertura del fondo per le calamità naturali, detti anche praticanti di Forma 3",
] as const;

export const LIGHT_INFLATION_EVENT_TITLE = "Inflazione di Luce";

export function getLightInflationEventDescription(cause: string): string {
  return `Lama di Luce aumenta i costi delle spade a causa ${cause}.`;
}

/** Every increase: +10%, plus wealth and demand (decision of 04/10/2026), at most +100%. */
const BASE_INCREASE = 0.1;
const MAX_INCREASE = 1;
/** Reference price: 0.5% of what the school earned in the school year just closed. */
const WEALTH_REFERENCE_SHARE = 0.005;
/** Demand: 30% of (swords bought ÷ swords owned before buying them). */
const DEMAND_WEIGHT = 0.3;
/** Moment key (4.2 queue). Not added to `seen`: it plays at every increase. */
export const LIGHT_INFLATION_MOMENT = "light-inflation";
export const LIGHT_INFLATION_EVENT_VISIBILITY_MS = 60_000;

export function createInitialLightInflationState(): LightInflationState {
  return {
    priceMultiplier: 1,
    increases: 0,
    purchasedSwords: 0,
    swordsBeforePurchases: 0,
    eurosEarnedAtCheck: 0,
  };
}

export function getOfficialSwordUnitCost(state: GameState): number {
  return GAME_CONFIG.officialSwordCost * state.lightInflation.priceMultiplier;
}

export function recordLightInflationPurchase(
  inflation: LightInflationState,
  purchasedSwords: number,
  swordsBefore: number,
): LightInflationState {
  return {
    ...inflation,
    purchasedSwords: inflation.purchasedSwords + purchasedSwords,
    swordsBeforePurchases: inflation.purchasedSwords > 0 ? inflation.swordsBeforePurchases : swordsBefore,
  };
}

/** Increase as a fraction (0.1 = +10%), rounded to whole percents so the stamp tells the truth. */
export function getLightInflationIncrease(
  unitPrice: number,
  yearEarnings: number,
  purchasedSwords: number,
  swordsBeforePurchases: number,
): number {
  const wealth = Math.max(0, yearEarnings * WEALTH_REFERENCE_SHARE / unitPrice - 1);
  const demand = DEMAND_WEIGHT * purchasedSwords / Math.max(1, swordsBeforePurchases);
  return Math.round(Math.min(MAX_INCREASE, BASE_INCREASE + wealth + demand) * 100) / 100;
}

export function postponeLightInflationEvent(
  state: GameState,
  elapsedMs: number,
): GameState {
  const event = state.lightInflation.event;
  const safeElapsedMs = Math.max(0, elapsedMs);
  if (!event || safeElapsedMs === 0) return state;

  return {
    ...state,
    lightInflation: {
      ...state.lightInflation,
      event: {
        ...event,
        occurredAt: event.occurredAt + safeElapsedMs,
        visibleUntil: event.visibleUntil + safeElapsedMs,
      },
    },
  };
}

/** Checked every September (decision of 06/10/2026, it used to be January). */
export function processSeptemberLightInflation(state: GameState, wallNow: number): GameState {
  const month = state.school.currentMonth;
  const inflation = state.lightInflation;
  if (getCalendarMonth(month) !== 9 || inflation.lastCheckedJanuaryMonth === month) return state;

  const eurosEarned = state.statistics.eurosEarned;
  const checked: LightInflationState = {
    ...inflation,
    lastCheckedJanuaryMonth: month,
    purchasedSwords: 0,
    swordsBeforePurchases: 0,
    eurosEarnedAtCheck: eurosEarned,
  };
  if (inflation.purchasedSwords <= 0) {
    return { ...state, lightInflation: checked };
  }

  const increase = getLightInflationIncrease(
    getOfficialSwordUnitCost(state),
    eurosEarned - inflation.eurosEarnedAtCheck,
    inflation.purchasedSwords,
    inflation.swordsBeforePurchases,
  );
  const [causeRoll, seed] = nextRandom(state.randomSeed);
  const cause = LIGHT_INFLATION_CAUSES[Math.floor(causeRoll * LIGHT_INFLATION_CAUSES.length)];
  return {
    ...state,
    randomSeed: seed,
    lightInflation: {
      ...checked,
      priceMultiplier: inflation.priceMultiplier * (1 + increase),
      increases: inflation.increases + 1,
      event: {
        cause,
        increase,
        occurredAt: wallNow,
        visibleUntil: wallNow + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
      },
    },
    moments: { ...state.moments, queue: [...state.moments.queue, LIGHT_INFLATION_MOMENT] },
  };
}
