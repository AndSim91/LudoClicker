/**
 * The stick athlete of the game (07/10): the same figure fights the Arena
 * finals, trains in the gym and goes to the events. Units of the gym: feet at
 * y 150, hips at 128, head at 96 (radius 7), limbs drawn with a 6-unit stroke.
 */
export const ATHLETE_INK = "#021e33";
export const ATHLETE_HEAD_R = 7;

export interface AthleteShape {
  head: [number, number];
  /** Torso, legs and arms, one stroked path. */
  d: string;
  /** The blade, hand to tip. */
  blade?: [number, number, number, number];
  /** The hilt above the hands, for blades held high (the roll-up). */
  hilt?: [number, number, number, number];
  /** A ponytail behind the head. */
  tail?: string;
}

/** Torso and legs, standing on x. */
export const athleteBody = (x: number) => `M${x} 104 L${x} 128 M${x} 128 L${x - 8} 150 M${x} 128 L${x + 9} 150`;

/** Guard holds the blade upright, attack reaches a partner 62 units away. */
export function athletePose(x: number, facing: 1 | -1, pose: "guard" | "attack"): AthleteShape {
  const hand = x + 14 * facing;
  const tip = pose === "guard" ? [hand + 4 * facing, 76] : [hand + 30 * facing, 90];
  return { head: [x, 96], d: `${athleteBody(x)} M${x} 110 L${hand} 116`, blade: [hand, 116, tip[0], tip[1]] };
}

/** Someone walking past, arms by the sides and no blade. */
export const visitorShape = (x: number): AthleteShape => ({
  head: [x, 96],
  d: `M${x} 104 L${x} 128 M${x} 128 L${x - 7} 150 M${x} 128 L${x + 8} 150 M${x} 110 L${x - 6} 123 M${x} 110 L${x + 6} 122`,
});

/** A ponytail falling behind the head of an athlete facing that way. */
export const ponytail = (x: number, facing: 1 | -1) =>
  `M${x - 4 * facing} 90 Q${x - 9 * facing} 93 ${x - 8 * facing} 103`;
