import type { BoutSide } from "../arena/boutChoreography";

/**
 * The match on the gym's central Arena (Modalità Onde, decisions of 06/10).
 * After every cut the point goes to whoever cut; then, now and then, a judge
 * raises a card: the chequered Style card (10%) changes nothing, the white card
 * cancels the point and the yellow one gives it to the other athlete (10%
 * together). Best of 5: whoever reaches 3 wins and the board goes back to 0:0.
 */

export type GymCard = "style" | "white" | "yellow";
export type GymScore = Record<BoutSide, number>;

export const GYM_MATCH_POINTS = 3;
export const GYM_STYLE_CARD_CHANCE = 0.1;
export const GYM_REFEREE_CARD_CHANCE = 0.1;
/** Share of the gym's cuts that come from a Disarmo. */
export const GYM_DISARM_CHANCE = 0.05;

export function rollGymCard(roll: () => number): GymCard | undefined {
  const value = roll();
  if (value < GYM_STYLE_CARD_CHANCE) return "style";
  if (value < GYM_STYLE_CARD_CHANCE + GYM_REFEREE_CARD_CHANCE) return roll() < 0.5 ? "white" : "yellow";
  return undefined;
}

const other = (side: BoutSide): BoutSide => (side === "a" ? "b" : "a");

/** The cut that scores, before any card. */
export const addGymPoint = (score: GymScore, side: BoutSide): GymScore => ({ ...score, [side]: score[side] + 1 });

/** What a card raised after `side`'s point does to the score. */
export function applyGymCard(score: GymScore, side: BoutSide, card: GymCard | undefined): GymScore {
  if (card === "white") return { ...score, [side]: score[side] - 1 };
  if (card === "yellow") return { ...score, [side]: score[side] - 1, [other(side)]: score[other(side)] + 1 };
  return score;
}

export const isGymMatchOver = (score: GymScore) => Math.max(score.a, score.b) >= GYM_MATCH_POINTS;
