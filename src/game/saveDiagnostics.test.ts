import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "./engine";
import { saveGame, trySaveGame } from "./save";
import type { GameState } from "./types";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("save diagnostics", () => {
  it("identifies a quota failure while writing the primary save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    const result = trySaveGame(createInitialState(1_000), 2_000);

    expect(result).toMatchObject({
      ok: false,
      error: {
        reason: "quota-exceeded",
        operation: "write-primary",
        errorName: "QuotaExceededError",
      },
    });
    if (!result.ok) expect(result.error.serializedLength).toBeGreaterThan(0);
  });

  it("identifies an unavailable storage while writing the backup", () => {
    const state = createInitialState(1_000);
    expect(saveGame(state, 2_000)).toBe(true);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });

    const result = trySaveGame(state, 3_000);

    expect(result).toMatchObject({
      ok: false,
      error: {
        reason: "storage-unavailable",
        operation: "write-backup",
        errorName: "Error",
        errorMessage: "Storage unavailable",
      },
    });
  });

  it("identifies a serialization failure", () => {
    const circularState = {
      ...createInitialState(1_000),
    } as GameState & { self?: unknown };
    circularState.self = circularState;

    const result = trySaveGame(circularState, 2_000);

    expect(result).toMatchObject({
      ok: false,
      error: {
        reason: "serialization-failed",
        operation: "serialize",
        errorName: "TypeError",
        serializedLength: null,
      },
    });
  });
});
