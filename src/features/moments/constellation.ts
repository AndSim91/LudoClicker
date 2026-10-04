/*
 * Nuova sede: a constellation that draws the symbol of the Ordine (the emblem
 * on the school banner, public/assets/ordine-emblem.webp, 184 × 240). Every
 * school is a star: the Sede madre is the tip of the blade, the next ones go
 * down the blade, then the inner flame and the waves at the base. Twenty-five
 * stars make the whole symbol; after that each new school lights up above the
 * tip. The stars still to light show as faint dots (concept D1).
 */

type Slot = readonly [key: string, x: number, y: number];

const single = (key: string, x: number, y: number): Slot[] => [[key, x, y]];
const pair = (key: string, x: number, y: number): Slot[] => [[`L${key}`, x, y], [`R${key}`, 184 - x, y]];

/** Star positions in the order the schools light them up. */
export const CONSTELLATION_SLOTS: readonly Slot[] = [
  ...single("T0", 92, 4), ...single("F", 92, 73),
  ...pair("1", 84, 110), ...pair("2", 72, 152), ...pair("J", 58, 180), ...pair("T", 46, 185), ...pair("I", 77, 197),
  ...single("B", 92, 213),
  ...single("I0", 92, 138), ...pair("F2", 80, 179), ...single("IB", 92, 190),
  ...pair("S", 4, 196), ...pair("K", 58, 212), ...pair("O", 37, 219), ...pair("O4", 68, 236),
];

const mirror = (a: string, b: string): [string, string][] => [[`L${a}`, `L${b}`], [`R${a}`, `R${b}`]];
const EDGE_KEYS: [string, string][] = [
  ["T0", "F"], ["F", "L1"], ["F", "R1"],
  ...mirror("1", "2"), ...mirror("2", "J"), ...mirror("J", "T"), ...mirror("J", "I"), ["LI", "B"], ["RI", "B"],
  ["I0", "LF2"], ["I0", "RF2"], ["LF2", "IB"], ["RF2", "IB"],
  ...mirror("S", "K"), ...mirror("K", "O"), ...mirror("O", "O4"),
];
const INDEX = new Map(CONSTELLATION_SLOTS.map(([key], index) => [key, index]));
export const EDGES = EDGE_KEYS.map(([a, b]) => [INDEX.get(a)!, INDEX.get(b)!] as const);
export const CROWN = [92, -16] as const;
export const CENTER_X = 92;

export const CONSTELLATION_SIZE = CONSTELLATION_SLOTS.length;

export type FoundationStar = {
  /** 0–1 from the Fama the school had when it was left; null when the save did not record it. */
  light: number | null;
};

