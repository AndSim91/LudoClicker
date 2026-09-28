import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState, gameReducer } from "./engine";
import { selectActiveEmail } from "./selectors";
import {
  applyFlowInput,
  getFlowMeterAt,
  getFlowMultiplier,
  getPerfectPhraseChance,
  getPerfectPhraseRoll,
} from "./writingRhythm";

describe("Flusso", () => {
  it("climbs one multiplier step per quarter of the meter, up to ×5", () => {
    expect(getFlowMultiplier(0)).toBe(1);
    expect(getFlowMultiplier(24.9)).toBe(1);
    expect(getFlowMultiplier(25)).toBe(2);
    expect(getFlowMultiplier(99)).toBe(4);
    expect(getFlowMultiplier(100)).toBe(5);
  });

  it("builds with a steady rhythm and empties after a pause", () => {
    let flow = applyFlowInput(undefined, 0);
    for (let input = 1; input <= 120; input += 1) flow = applyFlowInput(flow, input * 150);
    expect(getFlowMultiplier(flow.meter)).toBe(5);

    const afterPause = getFlowMeterAt(flow, flow.updatedAt + GAME_CONFIG.flowGraceMs + 3_000);
    expect(afterPause).toBe(0);
  });

  it("does not build when typing slower than the drain", () => {
    let flow = applyFlowInput(undefined, 0);
    for (let input = 1; input <= 60; input += 1) flow = applyFlowInput(flow, input * 1_000);
    expect(getFlowMultiplier(flow.meter)).toBe(1);
  });

  it("keeps a growing flow meter in the state while writing", () => {
    let state = createInitialState(1_000, "Tester");
    const emailId = selectActiveEmail(state)!.id;
    for (let input = 0; input < 60; input += 1) {
      state = gameReducer(state, { type: "WRITE", now: 1_000 + input * 100 });
      if (selectActiveEmail(state)?.id !== emailId) break;
    }
    // The level 0 draft is short: it ends before ×2, but the meter is saved and growing.
    expect(state.player.flow!.meter).toBeGreaterThan(GAME_CONFIG.flowGainPerInput * 5);
    expect(state.statistics.inputs).toBeLessThan(60);
  });
});

describe("Frase perfetta", () => {
  it("starts at 1% and reaches 10% with every Scrittura upgrade", () => {
    const state = createInitialState(1_000, "Tester");
    expect(getPerfectPhraseChance(state)).toBeCloseTo(0.01);
    const maxed = {
      ...state,
      upgrades: {
        ...state.upgrades,
        "comfortable-keyboard": 5,
        "quick-phrases": 5,
        "smart-fields": 5,
        "instant-review": 5,
      },
    };
    expect(getPerfectPhraseChance(maxed)).toBeCloseTo(0.1);
  });

  it("rolls deterministically without touching the shared random seed", () => {
    expect(getPerfectPhraseRoll("email-1", 7)).toBe(getPerfectPhraseRoll("email-1", 7));
    const rolls = Array.from({ length: 2_000 }, (_, index) => getPerfectPhraseRoll("email-x", index));
    const hits = rolls.filter((roll) => roll < 0.1).length;
    expect(hits).toBeGreaterThan(140);
    expect(hits).toBeLessThan(260);

    const state = createInitialState(1_000, "Tester");
    const written = gameReducer(state, { type: "WRITE", now: 1_100 });
    expect(written.randomSeed).toBe(state.randomSeed);
  });
});
