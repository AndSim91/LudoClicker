import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackgroundSavePreparer } from "./backgroundSavePreparation";
import { createInitialState } from "./engine";
import { prepareRebasedGameSave } from "./savePreparation";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("background save preparation", () => {
  it("defers the fallback and produces the exact synchronous save payload", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Worker", undefined);
    const state = createInitialState(1_000);
    const preparer = createBackgroundSavePreparer();
    let settled = false;

    const preparation = preparer.prepare(state, 1_500, 2_000).then((result) => {
      settled = true;
      return result;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.runAllTimersAsync();
    const result = await preparation;
    expect(result).toEqual(prepareRebasedGameSave(state, 1_500, 2_000));
    preparer.dispose();
  });
});
