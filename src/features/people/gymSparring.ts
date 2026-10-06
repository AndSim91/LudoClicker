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

// Idle 6-14 s, then a 30% roll: a pair spars roughly 10% of the time.
const IDLE_MIN_MS = 6_000;
const IDLE_SPAN_MS = 8_000;
const BOUT_CHANCE = 0.3;
const BOUT_MIN_MS = 2_500;
const BOUT_SPAN_MS = 2_500;

const between = (random: Random, min: number, max: number) => min + random() * (max - min);

/** How long a pair waits before rolling for a bout. */
export function nextIdleMs(random: Random): number {
  return IDLE_MIN_MS + random() * IDLE_SPAN_MS;
}

export function rollsBout(random: Random): boolean {
  return random() < BOUT_CHANCE;
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
