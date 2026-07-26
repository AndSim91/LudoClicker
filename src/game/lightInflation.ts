import { nextRandom } from "./random";
import { GAME_CONFIG } from "./config";
import type { GameState, LightInflationState } from "./types";

export const LIGHT_INFLATION_CAUSES = [
  "del finanziamento della Guerra d'Etiopia",
  "del finanziamento della crisi di Suez",
  "della ricostruzione post disastro del Vajont",
  "della ricostruzione post alluvione di Firenze",
  "della ricostruzione post terremoto del Belice",
  "della ricostruzione post terremoto del Friuli",
  "della ricostruzione post terremoto dell'Irpinia",
  "del finanziamento della missione di pace in Libano",
  "del finanziamento della missione di pace in Bosnia",
  "del rinnovo del contratto degli autoferrotranvieri",
  "dell'acquisto di autobus ecologici",
  "del finanziamento della cultura (FUS)",
  "della gestione dell'emergenza immigrazione post crisi libica",
  "della ricostruzione post alluvioni in Liguria e Toscana",
  'delle coperture del Decreto "Salva Italia"',
  "della ricostruzione post terremoto dell'Emilia",
  'del finanziamento del "Bonus Gestori"',
  'delle coperture del Decreto "Fare" per il sistema scolastico',
  "della copertura del fondo per le calamità naturali",
] as const;

export const LIGHT_INFLATION_EVENT_TITLE = "Inflazione di Luce";

export function getLightInflationEventDescription(cause: string): string {
  return `Lama di Luce aumenta i costi delle spade a causa ${cause}`;
}

const CHANCE_PER_SWORD = 10;
const PRICE_INCREASE = 1.1;
export const LIGHT_INFLATION_EVENT_VISIBILITY_MS = 60_000;

export function createInitialLightInflationState(): LightInflationState {
  return { chancePercent: 0, priceMultiplier: 1 };
}

export function getOfficialSwordUnitCost(state: GameState): number {
  return GAME_CONFIG.officialSwordCost * state.lightInflation.priceMultiplier;
}

export function addLightInflationChance(
  inflation: LightInflationState,
  purchasedSwords: number,
): LightInflationState {
  return {
    ...inflation,
    chancePercent: Math.min(100, inflation.chancePercent + purchasedSwords * CHANCE_PER_SWORD),
  };
}

export function processJanuaryLightInflation(state: GameState, wallNow: number): GameState {
  const januaryMonth = state.school.currentMonth;
  const inflation = state.lightInflation;
  if (januaryMonth % 12 !== 1 || inflation.lastCheckedJanuaryMonth === januaryMonth) return state;

  const checked = {
    ...inflation,
    lastCheckedJanuaryMonth: januaryMonth,
  };
  if (checked.chancePercent <= 0) {
    return { ...state, lightInflation: checked };
  }

  const [roll, seedAfterRoll] = nextRandom(state.randomSeed);
  if (roll >= checked.chancePercent / 100) {
    return { ...state, randomSeed: seedAfterRoll, lightInflation: checked };
  }

  const [causeRoll, seedAfterCause] = nextRandom(seedAfterRoll);
  const cause = LIGHT_INFLATION_CAUSES[Math.floor(causeRoll * LIGHT_INFLATION_CAUSES.length)];
  return {
    ...state,
    randomSeed: seedAfterCause,
    lightInflation: {
      ...checked,
      chancePercent: 0,
      priceMultiplier: checked.priceMultiplier * PRICE_INCREASE,
      event: {
        cause,
        occurredAt: wallNow,
        visibleUntil: wallNow + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
      },
    },
  };
}
