import { describe, expect, it } from "vitest";
import { GADGET_MINIGAME_CONFIG, GADGET_MINIGAME_DIFFICULTIES } from "../content/gadgets";
import { GADGET_RARITY_ORDER } from "../content/gadgetRarities";
import {
  calculateGadgetQuality,
  createGadgetRhythmNotes,
  getGadgetTimingResult,
  type GadgetRhythmNote,
} from "./gadgetMinigame";

function groupNotesByTarget(notes: readonly GadgetRhythmNote[]): GadgetRhythmNote[][] {
  const groups = new Map<number, GadgetRhythmNote[]>();

  for (const note of notes) {
    const group = groups.get(note.targetAtMs) ?? [];
    group.push(note);
    groups.set(note.targetAtMs, group);
  }

  return [...groups.values()];
}

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

  it("increases the note count by rarity while keeping the same time window", () => {
    const noteCounts = GADGET_RARITY_ORDER.map((rarity) => {
      const notes = createGadgetRhythmNotes(12_345, rarity);
      expect(notes).toHaveLength(GADGET_MINIGAME_DIFFICULTIES[rarity].noteCount);
      expect(notes[0]?.targetAtMs).toBe(GADGET_MINIGAME_CONFIG.firstTargetMs);
      expect(notes.at(-1)?.targetAtMs).toBe(GADGET_MINIGAME_CONFIG.lastTargetMs);
      return notes.length;
    });

    expect(noteCounts).toEqual([18, 24, 30, 36, 44]);
    expect(
      GADGET_RARITY_ORDER.map((rarity) => GADGET_MINIGAME_DIFFICULTIES[rarity].travelMs),
    ).toEqual([3_400, 2_900, 2_400, 1_900, 1_500]);
  });

  it("creates deterministic chords only at the higher rarities", () => {
    for (const rarity of GADGET_RARITY_ORDER) {
      const difficulty = GADGET_MINIGAME_DIFFICULTIES[rarity];

      for (const seed of [1, 17, 999, 12_345, 54_321, 999_999]) {
        const notes = createGadgetRhythmNotes(seed, rarity);
        const groups = groupNotesByTarget(notes);
        const chordGroups = groups.filter((group) => group.length > 1);

        expect(chordGroups.length).toBeGreaterThanOrEqual(difficulty.minimumChordGroups);
        expect(
          chordGroups.every(
            (group) => new Set(group.map((note) => note.lane)).size === group.length,
          ),
        ).toBe(true);
        expect(Math.max(...groups.map((group) => group.length))).toBeLessThanOrEqual(2);
        expect(createGadgetRhythmNotes(seed, rarity)).toEqual(notes);
      }
    }

    expect(
      new Set(createGadgetRhythmNotes(12_345, "common").map((note) => note.targetAtMs)).size,
    ).toBe(GADGET_MINIGAME_DIFFICULTIES.common.noteCount);
    expect(
      new Set(createGadgetRhythmNotes(12_345, "rare").map((note) => note.targetAtMs)).size,
    ).toBe(GADGET_MINIGAME_DIFFICULTIES.rare.noteCount);
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
