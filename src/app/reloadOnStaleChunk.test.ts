import { afterEach, describe, expect, it, vi } from "vitest";
import { reloadOnStaleChunk } from "./reloadOnStaleChunk";

describe("reloadOnStaleChunk", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("reloads once on a missing chunk, then lets a second failure through", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    const failing = () => Promise.reject(new TypeError("Failed to fetch dynamically imported module"));
    let now = 1_000_000;

    void reloadOnStaleChunk(failing, () => now)();
    await Promise.resolve();
    await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);

    now += 5_000;
    await expect(reloadOnStaleChunk(failing, () => now)()).rejects.toThrow("dynamically imported");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("passes a successful load through untouched", async () => {
    await expect(reloadOnStaleChunk(() => Promise.resolve(42))()).resolves.toBe(42);
  });
});
