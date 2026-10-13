/**
 * Cosmetic life of a sparring pair in the gym (Modalità Onde only). Most of the time
 * a pair just breathes; now and then a roll starts a short, random bout. Uses
 * Math.random on purpose: nothing here touches the game state or its seeded RNG.
 */

import { motionReduced } from "../../shared/motion";

export type Random = () => number;

export interface GymExchange {
  /** 0: the athlete on the left attacks, 1: the one on the right. */
  attacker: 0 | 1;
  /** How far the attacker steps in, in SVG units. */
  reach: number;
  attackMs: number;
  recoverMs: number;
  /** Whether the blades meet at the end of the attack. */
  clash: boolean;
}

/** How often a pair spars: a pause of idleMinMs + up to idleSpanMs, then a roll. */
export interface SparPace {
  idleMinMs: number;
  idleSpanMs: number;
  chance: number;
}

// 13/10, concept A2 «Moderato»: the central pair (the real bouts, with the cut)
// spars about a third of the time, the side pairs (soft exchanges) about a sixth.
export const CENTRAL_PACE: SparPace = { idleMinMs: 3_000, idleSpanMs: 4_000, chance: 0.55 };
export const SIDE_PACE: SparPace = { idleMinMs: 5_000, idleSpanMs: 7_000, chance: 0.35 };
const BOUT_MIN_MS = 2_500;
const BOUT_SPAN_MS = 2_500;

const between = (random: Random, min: number, max: number) => min + random() * (max - min);

/** How long a pair waits before rolling for a bout. */
export function nextIdleMs(random: Random, pace: SparPace): number {
  return pace.idleMinMs + random() * pace.idleSpanMs;
}

export function rollsBout(random: Random, pace: SparPace): boolean {
  return random() < pace.chance;
}

/**
 * A pair and the rack swaps (13/10): the scene sets `away` while one of its
 * athletes is at the rack (no bouts then); the pair keeps `busy` while it spars,
 * so nobody leaves halfway through a bout.
 */
export interface RackHold {
  away: boolean;
  busy: boolean;
}

/** A bout of a few seconds: quick exchanges, random attacker, reach and rhythm. */
export function planBout(random: Random): GymExchange[] {
  const length = BOUT_MIN_MS + random() * BOUT_SPAN_MS;
  const exchanges: GymExchange[] = [];
  let elapsed = 0;
  while (elapsed < length) {
    const exchange: GymExchange = {
      attacker: random() < 0.5 ? 0 : 1,
      reach: Math.round(between(random, 4, 10)),
      attackMs: Math.round(between(random, 160, 320)),
      recoverMs: Math.round(between(random, 180, 460)),
      clash: random() < 0.8,
    };
    exchanges.push(exchange);
    elapsed += exchange.attackMs + exchange.recoverMs;
  }
  return exchanges;
}

/** Steps of the two athletes while an exchange lands: the defender gives ground. */
export function exchangeSteps(exchange: GymExchange): [number, number] {
  const giveGround = Math.round(exchange.reach * 0.4);
  return exchange.attacker === 0
    ? [exchange.reach, giveGround]
    : [-giveGround, -exchange.reach];
}

export function canSpar(): boolean {
  // The gym is drawn only in Modalità Onde: no bouts behind the Outlook camouflage.
  return !document.hidden && document.documentElement.dataset.theme === "dark" && !motionReduced();
}
