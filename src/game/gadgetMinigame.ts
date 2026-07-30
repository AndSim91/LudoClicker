import {
  GADGET_MINIGAME_CONFIG,
  GADGET_MINIGAME_DIFFICULTIES,
  type GadgetMinigameDifficulty,
} from "../content/gadgets";
import type { GadgetRarity } from "./types";
import { nextRandom } from "./random";

export type GadgetLane = 0 | 1 | 2 | 3;
export type GadgetTimingJudgment = "perfect" | "good" | "almost" | "miss";

export interface GadgetRhythmNote {
  id: number;
  lane: GadgetLane;
  targetAtMs: number;
}

export interface GadgetTimingResult {
  judgment: Exclude<GadgetTimingJudgment, "miss">;
  points: number;
}

function createSingleNoteSequence(seed: number, noteCount: number): GadgetRhythmNote[] {
  const config = GADGET_MINIGAME_CONFIG;
  const span = config.lastTargetMs - config.firstTargetMs;
  const spacing = span / (noteCount - 1);
  let randomSeed = seed;
  let previousLane: GadgetLane | undefined;
  let repeatedLaneCount = 0;

  return Array.from({ length: noteCount }, (_, index) => {
    const [laneRoll, afterLane] = nextRandom(randomSeed);
    const [timingRoll, afterTiming] = nextRandom(afterLane);
    randomSeed = afterTiming;
    let lane = Math.min(3, Math.floor(laneRoll * 4)) as GadgetLane;
    if (lane === previousLane && repeatedLaneCount >= 1) {
      lane = ((lane + 1 + Math.floor(timingRoll * 3)) % 4) as GadgetLane;
    }
    repeatedLaneCount = lane === previousLane ? repeatedLaneCount + 1 : 0;
    previousLane = lane;
    const jitter =
      index === 0 || index === noteCount - 1
        ? 0
        : (timingRoll - 0.5) * Math.min(240, spacing * 0.35);
    return {
      id: index,
      lane,
      targetAtMs: Math.round(config.firstTargetMs + spacing * index + jitter),
    };
  });
}

function createChordGroupSizes(
  seed: number,
  difficulty: GadgetMinigameDifficulty,
): { groupSizes: number[]; randomSeed: number } {
  const groupSizes = [1];
  let remainingNotes = difficulty.noteCount - 2;
  let chordGroups = 0;
  let randomSeed = seed;

  while (remainingNotes > 0) {
    const [chordRoll, afterChord] = nextRandom(randomSeed);
    randomSeed = afterChord;
    const missingMinimumChords = difficulty.minimumChordGroups - chordGroups;
    const remainingChordSlots = Math.floor(remainingNotes / 2);
    const mustCreateChord = missingMinimumChords > 0 && remainingChordSlots <= missingMinimumChords;
    let groupSize = 1;

    if (remainingNotes >= 2 && (mustCreateChord || chordRoll < difficulty.chordChance)) {
      groupSize = 2;
      chordGroups += 1;
    }

    groupSizes.push(groupSize);
    remainingNotes -= groupSize;
  }

  groupSizes.push(1);
  return { groupSizes, randomSeed };
}

function createChordNoteSequence(
  seed: number,
  difficulty: GadgetMinigameDifficulty,
): GadgetRhythmNote[] {
  const config = GADGET_MINIGAME_CONFIG;
  const { groupSizes, randomSeed: seedAfterGroups } = createChordGroupSizes(seed, difficulty);
  const span = config.lastTargetMs - config.firstTargetMs;
  const spacing = span / (groupSizes.length - 1);
  let randomSeed = seedAfterGroups;
  let noteId = 0;

  return groupSizes.flatMap((groupSize, groupIndex) => {
    const [timingRoll, afterTiming] = nextRandom(randomSeed);
    randomSeed = afterTiming;
    const lanes: GadgetLane[] = [0, 1, 2, 3];
    for (let index = lanes.length - 1; index > 0; index -= 1) {
      const [laneRoll, afterLane] = nextRandom(randomSeed);
      randomSeed = afterLane;
      const swapIndex = Math.min(index, Math.floor(laneRoll * (index + 1)));
      [lanes[index], lanes[swapIndex]] = [lanes[swapIndex], lanes[index]];
    }
    const jitter =
      groupIndex === 0 || groupIndex === groupSizes.length - 1
        ? 0
        : (timingRoll - 0.5) * Math.min(240, spacing * 0.35);
    const targetAtMs = Math.round(config.firstTargetMs + spacing * groupIndex + jitter);

    return lanes.slice(0, groupSize).map((lane) => ({
      id: noteId++,
      lane,
      targetAtMs,
    }));
  });
}

export function createGadgetRhythmNotes(
  seed: number,
  rarity: GadgetRarity = "common",
): GadgetRhythmNote[] {
  const difficulty = GADGET_MINIGAME_DIFFICULTIES[rarity];
  return difficulty.chordChance === 0
    ? createSingleNoteSequence(seed, difficulty.noteCount)
    : createChordNoteSequence(seed, difficulty);
}

export function getGadgetTimingResult(deltaMs: number): GadgetTimingResult | undefined {
  const distance = Math.abs(deltaMs);
  const { timingWindows, points } = GADGET_MINIGAME_CONFIG;
  if (distance <= timingWindows.perfectMs) {
    return { judgment: "perfect", points: points.perfect };
  }
  if (distance <= timingWindows.goodMs) {
    return { judgment: "good", points: points.good };
  }
  if (distance <= timingWindows.almostMs) {
    return { judgment: "almost", points: points.almost };
  }
  return undefined;
}

export function calculateGadgetQuality(
  notePoints: readonly number[],
  falseInputs: number,
  noteCount: number = GADGET_MINIGAME_CONFIG.noteCount,
): number {
  const safeNoteCount = Math.max(1, Math.floor(noteCount));
  const total = notePoints.reduce(
    (sum, points) => sum + Math.max(0, Number.isFinite(points) ? points : 0),
    0,
  );
  return Math.max(0, Math.min(100, Math.round(total / safeNoteCount - Math.max(0, falseInputs))));
}
