import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "./config";
import { createInitialState, gameReducer } from "./engine";
import { migrate } from "./saveMigrations";
import { selectActiveEmail } from "./selectors";
import {
  applyFlowInput,
  getFlowCap,
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

  it("stays locked, one character per input, until Ritmo di battitura is bought", () => {
    let state = createInitialState(1_000, "Tester");
    expect(getFlowCap(state.upgrades)).toBe(1);
    for (let input = 0; input < 10; input += 1) {
      state = gameReducer(state, { type: "WRITE", now: 1_000 + input * 100 });
    }
    expect(state.player.flow).toBeUndefined();
    expect(selectActiveEmail(state)!.revealedCharacters).toBe(10);
  });

  it("caps the multiplier at ×2 on the first level and ×5 on the last", () => {
    const upgrades = createInitialState(1_000, "Tester").upgrades;
    expect(getFlowCap({ ...upgrades, "writing-rhythm": 1 })).toBe(2);
    expect(getFlowCap({ ...upgrades, "writing-rhythm": 4 })).toBe(5);

    let flow = applyFlowInput(undefined, 0, 2);
    for (let input = 1; input <= 120; input += 1) flow = applyFlowInput(flow, input * 150, 2);
    expect(getFlowMultiplier(flow.meter, 2)).toBe(2);
    expect(flow.meter).toBe(25);
  });

  it("keeps a growing flow meter in the state while writing", () => {
    const initial = createInitialState(1_000, "Tester");
    let state = { ...initial, upgrades: { ...initial.upgrades, "writing-rhythm": 4 } };
    const emailId = selectActiveEmail(state)!.id;
    for (let input = 0; input < 60; input += 1) {
      state = gameReducer(state, { type: "WRITE", now: 1_000 + input * 100 });
      if (selectActiveEmail(state)?.id !== emailId) break;
    }
    // The level 0 draft is short: it may end before ×2, but the meter is saved and growing.
    expect(state.player.flow!.meter).toBeGreaterThan(GAME_CONFIG.flowGainPerInput * 5);
    expect(state.statistics.inputs).toBeLessThan(60);
  });
});

describe("Frase perfetta", () => {
  it("is locked until Frasi fatte, then goes from 0,25% to 5% with the Scrittura nodes", () => {
    const state = createInitialState(1_000, "Tester");
    const withoutNode = {
      ...state,
      upgrades: { ...state.upgrades, "comfortable-keyboard": 5, "quick-phrases": 5 },
    };
    expect(getPerfectPhraseChance(state)).toBe(0);
    expect(getPerfectPhraseChance(withoutNode)).toBe(0);
    expect(getPerfectPhraseChance({
      ...state,
      upgrades: { ...state.upgrades, "stock-phrases": 1 },
    })).toBeCloseTo(0.0025);
    const maxed = {
      ...state,
      upgrades: {
        ...state.upgrades,
        "stock-phrases": 5,
        "comfortable-keyboard": 5,
        "quick-phrases": 5,
        "smart-fields": 5,
        "instant-review": 5,
      },
    };
    expect(getPerfectPhraseChance(maxed)).toBeCloseTo(0.05);
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

it("adds the two new Scrittura nodes to older saves", () => {
  const initial = createInitialState(1_000, "Tester");
  const upgrades: Partial<typeof initial.upgrades> = { ...initial.upgrades };
  delete upgrades["writing-rhythm"];
  delete upgrades["stock-phrases"];
  const migrated = migrate({ ...initial, version: 82, upgrades }) as typeof initial;
  expect(migrated.version).toBe(85);
  expect(migrated.upgrades["writing-rhythm"]).toBe(0);
  expect(migrated.upgrades["stock-phrases"]).toBe(0);
});
