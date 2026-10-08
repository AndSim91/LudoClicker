import { describe, expect, it } from "vitest";
import { readStoredFilters, toggleValue } from "./usePersistentFilters";

describe("readStoredFilters", () => {
  const defaults = { rarities: [] as string[], arenaMin: "", open: false };

  it("keeps only stored values whose type matches the defaults", () => {
    expect(readStoredFilters(JSON.stringify({ rarities: ["rare"], arenaMin: 5, open: true, extra: 1 }), defaults))
      .toEqual({ rarities: ["rare"], arenaMin: "", open: true });
    expect(readStoredFilters(JSON.stringify({ rarities: [1] }), defaults)).toEqual(defaults);
  });

  it("falls back to the defaults on missing or broken data", () => {
    expect(readStoredFilters(null, defaults)).toBe(defaults);
    expect(readStoredFilters("{oops", defaults)).toBe(defaults);
  });

  it("toggles a value in and out of a list", () => {
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
  });
});
