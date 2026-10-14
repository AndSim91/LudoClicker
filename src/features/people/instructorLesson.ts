import { getGymStageIndex, type GymRarity, type GymRarityCounts } from "../../content/gymStages";
import { nextRandom } from "../../game/random";
import type { FormBranch, FormId } from "../../game/types";

/**
 * «Lezione degli Istruttori» (13/10, Andrea): the scene of the Instructors card
 * in Modalità Onde. The same gym lesson always, which grows with the school:
 * students on two rows of four facing the instructor, weapons and blades drawn
 * every school year from the members (13/10), kata by the Forms the school can teach.
 * Scene units: a band 128 tall (y 50–178, feet at 150), as wide as the panel.
 */

/** Students on the mat by gym stage (gymStages.ts): 1, 2, 3, 4, 6 and 8 in the palazzetto. */
export const INSTRUCTOR_SCENE_CAPS = [1, 2, 3, 4, 6, 8] as const;
/** In a narrow panel (under 400 units) two rows of two at most. */
export const NARROW_SCENE_UNITS = 400;
export const SCENE_TOP = 50;
export const SCENE_HEIGHT = 128;

export type SceneWeapon = "long" | "staff" | "dual";
export type KataLevel = 1 | 2 | 3;

export interface SceneStudent {
  x: number;
  rarity: GymRarity;
  weapon: SceneWeapon;
  /** Back row: smaller and darker, behind the instructor's lane. */
  back: boolean;
  /** Seconds after the instructor: each repeats the movement a beat later. */
  delay: number;
}

export interface InstructorScenePlan {
  stage: number;
  level: KataLevel;
  /** Where the instructor leads the lesson. */
  spot: number;
  students: SceneStudent[];
  /** Correction round: where the instructor stops, left to right. */
  stops: number[];
}

/** Forma 1: guard and cut. Forma 2: also the high parry. From Corso Y: also the thrust. */
export function getKataLevel(coverage: readonly FormId[]): KataLevel {
  if (coverage.includes("course-y")) return 3;
  return coverage.includes("form-2") ? 2 : 1;
}

export function getSceneStudentCount(studentsInCourses: number, activeMembers: number, narrow: boolean): number {
  const cap = INSTRUCTOR_SCENE_CAPS[getGymStageIndex(activeMembers)];
  return Math.max(0, Math.min(studentsInCourses, cap, narrow ? 4 : 8));
}

export type SceneWeaponShares = Record<SceneWeapon, number>;

const BRANCH_WEAPON: Record<FormBranch, SceneWeapon> = {
  "Spada Lunga": "long",
  Staffa: "staff",
  "Doppia spada corta": "dual",
};

/**
 * How many members hold each weapon: a member counts for his preferred weapons (shared
 * equally among them), the long saber without preferences. `count` is for the archive.
 */
export function getSceneWeaponShares(
  members: Iterable<{ formBranchPreferences?: readonly FormBranch[]; count?: number }>,
): SceneWeaponShares {
  const shares: SceneWeaponShares = { long: 0, staff: 0, dual: 0 };
  for (const member of members) {
    const people = member.count ?? 1;
    const branches = member.formBranchPreferences ?? [];
    if (branches.length === 0) shares.long += people;
    for (const branch of branches) shares[BRANCH_WEAPON[branch]] += people / branches.length;
  }
  return shares;
}

function pickWeighted<T extends string>(weights: Partial<Record<T, number>>, roll: number, fallback: T): T {
  const entries = (Object.entries(weights) as [T, number][]).filter(([, weight]) => weight > 0);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let left = roll * total;
  for (const [key, weight] of entries) {
    if (left < weight) return key;
    left -= weight;
  }
  return entries.at(-1)?.[0] ?? fallback;
}

/** Rarest first: with few places, the rare ones are the ones worth showing. */
const RARITIES_RAREST_FIRST: GymRarity[] = ["secret-legendary", "legendary", "ultra-rare", "rare", "common"];
const WEAPONS_EXOTIC_FIRST: SceneWeapon[] = ["staff", "dual", "long"];

/**
 * Every kind present gets a place first, as far as the places go; the rest are drawn
 * with the members' shares. Then the order is shuffled.
 */
function representAll<T extends string>(
  kinds: readonly T[],
  weights: Partial<Record<T, number>>,
  count: number,
  fallback: T,
  seed: number,
): T[] {
  let next = seed;
  const roll = () => {
    const [value, after] = nextRandom(next);
    next = after;
    return value;
  };
  const picked = kinds.filter((kind) => (weights[kind] ?? 0) > 0).slice(0, count);
  while (picked.length < count) picked.push(pickWeighted(weights, roll(), fallback));
  for (let index = picked.length - 1; index > 0; index -= 1) {
    const other = Math.floor(roll() * (index + 1));
    [picked[index], picked[other]] = [picked[other], picked[index]];
  }
  return picked;
}

/**
 * Weapons and blade colours of the students (Andrea, 13/10 and 14/10): drawn again at
 * every school year. Every rarity and every weapon of the school is on the mat when the
 * places allow it (the rarest first), the other places follow the members' shares, in
 * a new order each year. The first place (closest to the instructor) keeps a long saber
 * whenever someone holds one.
 */
export function rollSceneStudents(
  count: number,
  schoolYear: number,
  rarityCounts: GymRarityCounts,
  weaponShares: SceneWeaponShares,
): { rarity: GymRarity; weapon: SceneWeapon }[] {
  const seed = schoolYear * 7_919 + count * 104_729 + 17;
  const rarities = representAll(RARITIES_RAREST_FIRST, rarityCounts, count, "common", seed);
  const weapons = representAll(WEAPONS_EXOTIC_FIRST, weaponShares, count, "long", seed + 1);
  const firstLong = weapons.indexOf("long");
  if (firstLong > 0) [weapons[0], weapons[firstLong]] = [weapons[firstLong], weapons[0]];
  return rarities.map((rarity, index) => ({ rarity, weapon: weapons[index] }));
}

const spread = (n: number, from: number, to: number) =>
  Array.from({ length: n }, (_, index) => (n > 1 ? from + ((to - from) * index) / (n - 1) : (from + to) / 2));

export function planInstructorScene({
  width,
  studentsInCourses,
  activeMembers,
  rarityCounts,
  weaponShares,
  schoolYear,
  coverage,
}: {
  /** Panel width in scene units (128 × width / height). */
  width: number;
  studentsInCourses: number;
  activeMembers: number;
  rarityCounts: GymRarityCounts;
  weaponShares: SceneWeaponShares;
  schoolYear: number;
  coverage: readonly FormId[];
}): InstructorScenePlan {
  const narrow = width < NARROW_SCENE_UNITS;
  const count = getSceneStudentCount(studentsInCourses, activeMembers, narrow);
  const rolled = rollSceneStudents(count, schoolYear, rarityCounts, weaponShares);
  // Front row takes the even places, back row the odd ones, staggered.
  const frontCount = Math.ceil(count / 2);
  const frontX = spread(frontCount, narrow ? 112 : 136, width - (narrow ? 58 : 66));
  const backX = spread(count - frontCount, narrow ? 146 : 170, width - (narrow ? 30 : 34));
  const students = rolled.map(({ rarity, weapon }, index): SceneStudent => {
    const back = index % 2 === 1;
    const row = Math.floor(index / 2);
    return {
      x: back ? backX[row] : frontX[row],
      rarity,
      weapon,
      back,
      delay: (back ? 0.5 : 0.45) + row * 0.07,
    };
  });
  return {
    stage: getGymStageIndex(activeMembers),
    level: getKataLevel(coverage),
    spot: narrow ? 36 : 50,
    students,
    stops: students.map((student) => student.x - 16).sort((a, b) => a - b),
  };
}

/** Next correction round: every 60–90 s (13/10). */
export const nextRoundDelayMs = (random: () => number = Math.random) => 60_000 + random() * 30_000;
/** The instructor stands 1.8 s by each student, then walks back in 3 s. */
export const ROUND_STOP_MS = 1_800;
export const ROUND_BACK_MS = 3_000;

/** Staff moves (concepts V1 Otto, V3 Mulino, V4 Spazzata e cavatappi), picked at random at every loop. */
export const STAFF_MOVES = ["otto", "mulino", "spazzata"] as const;
export type StaffMove = (typeof STAFF_MOVES)[number];
export function pickStaffMove(current: StaffMove | undefined, random: () => number = Math.random): StaffMove {
  const options = STAFF_MOVES.filter((move) => move !== current);
  return options[Math.floor(random() * options.length)] ?? STAFF_MOVES[0];
}

/**
 * Istruttore a riposo (Andrea, 13/10): without courses he practises sword tricks on his
 * own, one at a time at random (concepts A rin di polso, B otto, D lancio e presa,
 * E elicottero, I freestyle con scia). The lengths match instructor-scene.css.
 */
export const IDLE_TRICK_MS = { a: 3_000, b: 3_600, d: 2_600, e: 3_200, i: 2_000 } as const;
export type IdleTrick = keyof typeof IDLE_TRICK_MS;
const IDLE_TRICKS = Object.keys(IDLE_TRICK_MS) as IdleTrick[];

/** Any trick but the last one. */
export function pickIdleTrick(previous: IdleTrick | undefined, random: () => number = Math.random): IdleTrick {
  const choices = IDLE_TRICKS.filter((trick) => trick !== previous);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

/** In guard between two tricks. */
export const idlePauseMs = (random: () => number = Math.random) => 1_200 + random() * 1_800;
