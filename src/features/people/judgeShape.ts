/**
 * The stick judge of the game, as athleteShape.ts is the athlete: one place for
 * the figure, so every scene with judges (the gym, later the finals) draws the
 * same person. Units of the gym: feet at y 150; x is where the judge stands (or
 * where the chair is), f the side the judge faces (1 = right).
 */
export type JudgePose = "standing" | "seated";
export type JudgeKind = "phone" | "shirt";

export interface JudgeShape {
  head: [number, number];
  /** Torso and legs, one stroked path. */
  body: string;
  /** Arms that never move (the phone arm, the far arm). */
  arms: string;
  /** The arm that raises the card, at rest. */
  cardArm: string;
  /** The Servizio phone in hand. */
  phone?: [number, number];
  /** Where the card arm starts. */
  shoulder: [number, number];
}

/** The judge's chair: it stays at the Arena's edge when the judge gets up. */
export const judgeChair = (x: number, f: 1 | -1) =>
  `M${x - 12 * f} 136 H${x + 6 * f} M${x - 11 * f} 136 V115 M${x - 10 * f} 136 V150 M${x + 4 * f} 136 V150`;

export function judgeShape(kind: JudgeKind, pose: JudgePose, x: number, f: 1 | -1): JudgeShape {
  if (pose === "seated") {
    // Sits a little behind his spot, knees towards the Arena.
    const hx = x - 3 * f;
    return {
      head: [hx, 106],
      body: `M${hx} 113 L${hx} 133 L${x + 10 * f} 133 L${x + 11 * f} 150`,
      arms: kind === "phone" ? `M${hx} 118 L${hx + 7 * f} 126 L${hx + 11 * f} 122` : "",
      cardArm: `M${hx} 118 L${hx + 5 * f} 127 L${hx + 9 * f} 131`,
      phone: kind === "phone" ? [hx + 10 * f, 115] : undefined,
      shoulder: [hx, 118],
    };
  }
  if (kind === "phone") {
    return {
      head: [x, 100],
      body: `M${x} 107 L${x} 128 M${x} 128 L${x - 7} 150 M${x} 128 L${x + 7} 150`,
      arms: `M${x} 112 L${x - 8} 120 L${x - 5} 125`,
      cardArm: `M${x} 112 L${x + 7 * f} 121 L${x + 8 * f} 128`,
      phone: [x - 10, 119],
      shoulder: [x, 112],
    };
  }
  // The blue T-shirt: both arms hang from the sleeves, same length.
  return {
    head: [x, 100],
    body: `M${x} 107 L${x} 128 M${x} 128 L${x - 7} 150 M${x} 128 L${x + 7} 150`,
    arms: `M${x - 9 * f} 115 L${x - 11 * f} 124`,
    cardArm: `M${x + 9 * f} 115 L${x + 11 * f} 124`,
    shoulder: [x + 9 * f, 115],
  };
}
