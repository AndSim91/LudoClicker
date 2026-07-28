import { describe, expect, it } from "vitest";
import { GADGET_MINIGAME_CONFIG } from "../content/gadgets";
import {
  calculateGadgetQuality,
  createGadgetRhythmNotes,
  getGadgetTimingResult,
} from "./gadgetMinigame";

describe("Gadget quality minigame", () => {
  it("creates a deterministic neutral sequence without simultaneous notes", () => {
    const first = createGadgetRhythmNotes(12_345);
    const repeated = createGadgetRhythmNotes(12_345);
    const different = createGadgetRhythmNotes(54_321);

    expect(first).toEqual(repeated);
    expect(first).not.toEqual(different);
    expect(first).toHaveLength(GADGET_MINIGAME_CONFIG.noteCount);
    expect(new Set(first.map((note) => note.targetAtMs)).size).toBe(first.length);
    expect(first.every((note) => note.lane >= 0 && note.lane <= 3)).toBe(true);
  });

  it("uses the confirmed timing windows", () => {
    expect(getGadgetTimingResult(100)).toEqual({ judgment: "perfect", points: 100 });
    expect(getGadgetTimingResult(-200)).toEqual({ judgment: "good", points: 70 });
    expect(getGadgetTimingResult(320)).toEqual({ judgment: "almost", points: 40 });
    expect(getGadgetTimingResult(321)).toBeUndefined();
  });

  it("subtracts one quality point for every false input", () => {
    expect(calculateGadgetQuality([100, 70, 40, 0], 3, 4)).toBe(50);
    expect(calculateGadgetQuality([0, 0], 10, 2)).toBe(0);
  });
});
