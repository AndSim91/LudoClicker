import { describe, expect, it } from "vitest";
import { getTickStepMs } from "./useAppPreferences";

describe("game rhythm per display mode", () => {
  it("runs at 0,5 s with the animations and 1 s without, in both themes", () => {
    expect(getTickStepMs(true, false)).toBe(500);
    expect(getTickStepMs(false, false)).toBe(500);
    expect(getTickStepMs(true, true)).toBe(1_000);
    expect(getTickStepMs(false, true)).toBe(1_000);
  });
});
