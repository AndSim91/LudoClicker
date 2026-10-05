/**
 * End-of-final stances for a stick athlete (see Fighter in GymPair.tsx): the
 * winner celebrates, the loser takes it badly with the blade switched off.
 * Same units as the gym: feet at y 150, hips at 128, head at 96.
 */
export const WIN_BODIES = ["win-sky", "win-v", "win-fist"] as const;
export const LOSE_BODIES = ["lose-head", "lose-knee", "lose-hand"] as const;
export type FighterBody = (typeof WIN_BODIES)[number] | (typeof LOSE_BODIES)[number];

export interface BodyShape {
  head: [number, number];
  d: string;
  blade: [number, number, number, number];
  fist?: [number, number];
  /** The loser's blade is off. */
  off?: boolean;
}

const legs = (x: number, w: number) => `M${x} 128 L${x - w} 150 M${x} 128 L${x + w + 1} 150`;

export function bodyShape(body: FighterBody, x: number, f: 1 | -1): BodyShape {
  switch (body) {
    case "win-sky": // both hands on the hilt, blade straight up
      return {
        head: [x, 95],
        d: `M${x} 103 L${x} 128 ${legs(x, 10)} M${x} 108 L${x + 5 * f} 95 L${x + 2 * f} 82 M${x} 108 L${x - 4 * f} 95 L${x + f} 82`,
        blade: [x + 1.5 * f, 82, x + 3 * f, 40],
      };
    case "win-v": // arms in a V, blade high
      return {
        head: [x, 95],
        d: `M${x} 103 L${x} 128 ${legs(x, 11)} M${x} 108 L${x + 9 * f} 97 L${x + 14 * f} 85 M${x} 108 L${x - 9 * f} 97 L${x - 14 * f} 85`,
        blade: [x + 14 * f, 85, x + 30 * f, 50],
        fist: [x - 14 * f, 84],
      };
    case "win-fist": // free fist to the sky, blade low
      return {
        head: [x, 95],
        d: `M${x} 103 L${x} 128 ${legs(x, 10)} M${x} 108 L${x - 5 * f} 94 L${x - 4 * f} 80 M${x} 110 L${x + 10 * f} 122`,
        blade: [x + 10 * f, 122, x + 32 * f, 138],
        fist: [x - 4 * f, 79],
      };
    case "lose-head": // head down, blade tip on the floor
      return {
        head: [x + 4 * f, 101],
        d: `M${x + 2 * f} 108 L${x} 129 M${x} 129 L${x - 7} 150 M${x} 129 L${x + 8} 150 M${x + f} 112 L${x + 4 * f} 124 L${x + 6 * f} 132 M${x + f} 112 L${x - 2 * f} 124 L${x - f} 133`,
        blade: [x + 6 * f, 132, x + 16 * f, 151],
        off: true,
      };
    case "lose-knee": // on one knee, the sword laid on the floor
      return {
        head: [x + 5 * f, 100],
        d: `M${x + 3 * f} 107 L${x} 134 M${x} 134 L${x + 10 * f} 137 L${x + 9 * f} 150 M${x} 134 L${x - 4 * f} 150 L${x - 15 * f} 150 M${x + 2 * f} 112 L${x + 7 * f} 124 L${x + 10 * f} 134 M${x + 2 * f} 112 L${x - f} 124 L${x} 134`,
        blade: [x + 18 * f, 150, x + 44 * f, 150],
        off: true,
      };
    case "lose-hand": // free hand on the head
      return {
        head: [x + f, 97],
        d: `M${x} 104 L${x} 128 ${legs(x, 7)} M${x} 109 L${x - 9 * f} 100 L${x - 2 * f} 89 M${x} 110 L${x + 5 * f} 124 L${x + 6 * f} 132`,
        blade: [x + 6 * f, 132, x + 20 * f, 151],
        off: true,
      };
  }
}
