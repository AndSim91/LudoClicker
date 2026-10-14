/**
 * The match on the gym's central Arena (Modalità Onde, decisions of 06/10). After
 * a cut, now and then, a judge raises a card: the chequered Style card (10%), the
 * white or the yellow one (10% together). The scoreboard left the hall on 14/10, so
 * the cards no longer move a score.
 */

export type GymCard = "style" | "white" | "yellow";
export const GYM_STYLE_CARD_CHANCE = 0.1;
export const GYM_REFEREE_CARD_CHANCE = 0.1;
/** After a point the seated Style judge may get up to look closer, for 4–10 s. */
export const GYM_JUDGE_STAND_CHANCE = 0.05;
export const GYM_JUDGE_STAND_MS: [number, number] = [4_000, 10_000];
/** Share of the gym's cuts that come from a Disarmo. */
export const GYM_DISARM_CHANCE = 0.05;

export function rollGymCard(roll: () => number): GymCard | undefined {
  const value = roll();
  if (value < GYM_STYLE_CARD_CHANCE) return "style";
  if (value < GYM_STYLE_CARD_CHANCE + GYM_REFEREE_CARD_CHANCE) return roll() < 0.5 ? "white" : "yellow";
  return undefined;
}
