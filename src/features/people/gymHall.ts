import { GYM_STAGES } from "../../content/gymStages";

/**
 * Layout of the gym by stage (concepts of 14/10). From the Palazzetto on the scene is
 * the hall; `hallLevel` counts the hall's stages: 0 Palazzetto («Luci da evento»),
 * 1 Arena delle Onde, 2 Arena da Campionato, 3 Palasport, 4 Stadio delle Onde.
 * Each level keeps everything of the one before.
 */

export const HALL_STAGE = GYM_STAGES.findIndex((stage) => stage.name === "Palazzetto");

export const HALL_LEVEL = { palazzetto: 0, onde: 1, championship: 2, palasport: 3, stadium: 4 } as const;

/** The rack on the right (1, as always) or its mirror on the left (-1), x → 640 − x. */
export type RackSide = 1 | -1;
export const mirrorX = (x: number, side: RackSide) => (side > 0 ? x : 640 - x);

/** Lamp x and aim x of the lights sweeping the Arena. */
type Sweep = [number, number];

export interface GymLayout {
  /** -1 below the Palazzetto. */
  hallLevel: number;
  /** Left athlete's x of each pair, central pair first (the refereed bout). */
  pairSpots: number[];
  /** The Style judge (seated, phone) and the one in the blue T-shirt. */
  judgeXs: [number, number];
  mat: { x: number; w: number };
  /** The row of fans right behind the mat (from the Arena e giudici). */
  front: { x: number; heads: number };
  sweeps: Sweep[];
  racks: RackSide[];
}

export const PAIR_GAP = 62;
const SWEEPS: Sweep[] = [[60, 300], [580, 340]];

export function getGymLayout(stage: number): GymLayout {
  const hallLevel = stage >= HALL_STAGE ? stage - HALL_STAGE : -1;
  const championship = hallLevel >= HALL_LEVEL.championship;
  return {
    hallLevel,
    pairSpots: championship ? [290, 110, 470, -50, 630] : [290, 170, 408],
    judgeXs: championship ? [225, 418] : [100, 550],
    mat: championship ? { x: -80, w: 810 } : { x: 140, w: 360 },
    front: championship ? { x: -96, heads: 35 } : { x: 56, heads: 22 },
    sweeps: hallLevel >= HALL_LEVEL.stadium
      ? [[-395, 300], [1035, 340], [-395, 200], [1035, 440]]
      : hallLevel >= HALL_LEVEL.palasport ? [...SWEEPS, [-200, 230], [840, 410]] : SWEEPS,
    racks: hallLevel >= HALL_LEVEL.onde ? [1, -1] : [1],
  };
}

/** From the championship each pair changes blades at the rack on its own side; before, all go right. */
export function getRackSide(layout: GymLayout, pair: number): RackSide {
  const spot = layout.pairSpots[pair] ?? 0;
  return layout.hallLevel >= HALL_LEVEL.championship && spot + PAIR_GAP / 2 < 320 ? -1 : 1;
}
