import { getGymSaberRarities, getGymStageIndex, type GymRarity, type GymRarityCounts } from "../../content/gymStages";
import type { FormId } from "../../game/types";

/**
 * «Lezione degli Istruttori» (13/10, Andrea): the scene of the Instructors card
 * in Modalità Onde. The same gym lesson always, which grows with the school:
 * students on two rows of four facing the instructor, blades by the members'
 * rarities, weapons and kata by the Forms the school can teach.
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

/** Everybody holds a long saber; one staff and one pair of short sabers when the school teaches those Forms. */
export function getSceneWeapons(count: number, coverage: readonly FormId[]): SceneWeapon[] {
  const weapons = Array<SceneWeapon>(count).fill("long");
  if (count < 2) return weapons;
  if (coverage.some((formId) => formId.endsWith("-staff"))) weapons[Math.min(2, count - 1)] = "staff";
  if (coverage.some((formId) => formId.endsWith("-double"))) {
    // The first student (closest to the instructor) always keeps the long saber.
    const slot = weapons.findIndex((weapon, index) => index > 0 && weapon === "long");
    if (slot > 0) weapons[slot] = "dual";
  }
  return weapons;
}

const spread = (n: number, from: number, to: number) =>
  Array.from({ length: n }, (_, index) => (n > 1 ? from + ((to - from) * index) / (n - 1) : (from + to) / 2));

export function planInstructorScene({
  width,
  studentsInCourses,
  activeMembers,
  rarityCounts,
  coverage,
}: {
  /** Panel width in scene units (128 × width / height). */
  width: number;
  studentsInCourses: number;
  activeMembers: number;
  rarityCounts: GymRarityCounts;
  coverage: readonly FormId[];
}): InstructorScenePlan {
  const narrow = width < NARROW_SCENE_UNITS;
  const count = getSceneStudentCount(studentsInCourses, activeMembers, narrow);
  const rarities = getGymSaberRarities(rarityCounts, count);
  const weapons = getSceneWeapons(count, coverage);
  // Front row takes the even places, back row the odd ones, staggered.
  const frontCount = Math.ceil(count / 2);
  const frontX = spread(frontCount, narrow ? 112 : 136, width - (narrow ? 58 : 66));
  const backX = spread(count - frontCount, narrow ? 146 : 170, width - (narrow ? 30 : 34));
  const students = rarities.map((rarity, index): SceneStudent => {
    const back = index % 2 === 1;
    const row = Math.floor(index / 2);
    return {
      x: back ? backX[row] : frontX[row],
      rarity,
      weapon: weapons[index],
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
