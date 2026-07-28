import { GADGET_MINIGAME_CONFIG } from "../content/gadgets";
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

export function createGadgetRhythmNotes(seed: number): GadgetRhythmNote[] {
  const config = GADGET_MINIGAME_CONFIG;
  const span = config.lastTargetMs - config.firstTargetMs;
  const spacing = span / (config.noteCount - 1);
  let randomSeed = seed;
  let previousLane: GadgetLane | undefined;
  let repeatedLaneCount = 0;

  return Array.from({ length: config.noteCount }, (_, index) => {
    const [laneRoll, afterLane] = nextRandom(randomSeed);
    const [timingRoll, afterTiming] = nextRandom(afterLane);
    randomSeed = afterTiming;
    let lane = Math.min(3, Math.floor(laneRoll * 4)) as GadgetLane;
    if (lane === previousLane && repeatedLaneCount >= 1) {
      lane = ((lane + 1 + Math.floor(timingRoll * 3)) % 4) as GadgetLane;
    }
    repeatedLaneCount = lane === previousLane ? repeatedLaneCount + 1 : 0;
    previousLane = lane;
    const jitter = index === 0 || index === config.noteCount - 1
      ? 0
      : (timingRoll - 0.5) * Math.min(240, spacing * 0.35);
    return {
      id: index,
      lane,
      targetAtMs: Math.round(config.firstTargetMs + spacing * index + jitter),
    };
  });
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
  return Math.max(
    0,
    Math.min(100, Math.round(total / safeNoteCount - Math.max(0, falseInputs))),
  );
}
