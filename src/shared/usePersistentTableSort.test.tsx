import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./storageKeys";
import { usePersistentTableSort } from "./usePersistentTableSort";

type TestSort = {
  key: "name" | "score";
  direction: "ascending" | "descending";
};

const TEST_SORT_KEYS = ["name", "score"] as const;
const TEST_STORAGE_KEY = `${STORAGE_KEYS.tableSortPrefix}.test-table`;

function useTestSort(defaultSort: TestSort | null = null) {
  return usePersistentTableSort<TestSort>({
    storageId: "test-table",
    allowedKeys: TEST_SORT_KEYS,
    defaultSort,
  });
}

describe("usePersistentTableSort", () => {
  it("salva e ripristina l'ordinamento valido della singola tabella", () => {
    const firstRender = renderHook(() => useTestSort());

    act(() => {
      firstRender.result.current.setSort({
        key: "score",
        direction: "descending",
      });
    });

    expect(localStorage.getItem(TEST_STORAGE_KEY)).toBe(
      JSON.stringify({ key: "score", direction: "descending" }),
    );
    firstRender.unmount();

    const secondRender = renderHook(() => useTestSort());
    expect(secondRender.result.current.sort).toEqual({
      key: "score",
      direction: "descending",
    });
    expect(secondRender.result.current.isDefaultSort).toBe(false);
  });

  it("rimuove la preferenza e ripristina l'ordinamento predefinito", () => {
    const defaultSort: TestSort = { key: "score", direction: "descending" };
    const { result } = renderHook(() => useTestSort(defaultSort));

    act(() => {
      result.current.setSort({ key: "name", direction: "ascending" });
    });
    expect(localStorage.getItem(TEST_STORAGE_KEY)).not.toBeNull();

    act(() => {
      result.current.resetSort();
    });

    expect(result.current.sort).toEqual(defaultSort);
    expect(result.current.isDefaultSort).toBe(true);
    expect(localStorage.getItem(TEST_STORAGE_KEY)).toBeNull();
  });

  it("ignora preferenze malformate o riferite a colonne non ammesse", () => {
    localStorage.setItem(
      TEST_STORAGE_KEY,
      JSON.stringify({ key: "unknown", direction: "ascending" }),
    );

    const { result } = renderHook(() => useTestSort());

    expect(result.current.sort).toBeNull();
    expect(result.current.isDefaultSort).toBe(true);
  });

  it("mantiene l'ordinamento attivo se lo storage del browser non è disponibile", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const { result } = renderHook(() => useTestSort());

    act(() => {
      result.current.setSort({ key: "name", direction: "ascending" });
    });

    expect(result.current.sort).toEqual({ key: "name", direction: "ascending" });
    setItem.mockRestore();
  });
});
