import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { STORAGE_KEYS } from "./storageKeys";

export type TableSortDirection = "ascending" | "descending";

export interface TableSortPreference {
  key: string;
  direction: TableSortDirection;
}

interface PersistentTableSortOptions<TSort extends TableSortPreference> {
  storageId: string;
  allowedKeys: readonly TSort["key"][];
  defaultSort: TSort | null;
}

function getStorageKey(storageId: string): string {
  return `${STORAGE_KEYS.tableSortPrefix}.${storageId}`;
}

function sortsMatch(
  left: TableSortPreference | null,
  right: TableSortPreference | null,
): boolean {
  return left?.key === right?.key && left?.direction === right?.direction;
}

function readStoredSort<TSort extends TableSortPreference>(
  storageKey: string,
  allowedKeys: readonly TSort["key"][],
  defaultSort: TSort | null,
): TSort | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultSort;

    const parsed = JSON.parse(raw) as Partial<TableSortPreference> | null;
    if (
      !parsed ||
      typeof parsed.key !== "string" ||
      !allowedKeys.includes(parsed.key) ||
      (parsed.direction !== "ascending" && parsed.direction !== "descending")
    ) {
      return defaultSort;
    }

    return parsed as TSort;
  } catch {
    return defaultSort;
  }
}

function persistSort(
  storageKey: string,
  sort: TableSortPreference | null,
  defaultSort: TableSortPreference | null,
): void {
  try {
    if (sortsMatch(sort, defaultSort)) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(sort));
  } catch {
    // L'ordinamento continua a funzionare anche se lo storage del browser non è disponibile.
  }
}

export function usePersistentTableSort<TSort extends TableSortPreference>({
  storageId,
  allowedKeys,
  defaultSort,
}: PersistentTableSortOptions<TSort>): {
  sort: TSort | null;
  setSort: Dispatch<SetStateAction<TSort | null>>;
  resetSort: () => void;
  isDefaultSort: boolean;
} {
  const storageKey = getStorageKey(storageId);
  const [sort, setSortState] = useState<TSort | null>(() =>
    readStoredSort(storageKey, allowedKeys, defaultSort)
  );

  const setSort: Dispatch<SetStateAction<TSort | null>> = useCallback((action) => {
    setSortState((current) => {
      const next = typeof action === "function" ? action(current) : action;
      persistSort(storageKey, next, defaultSort);
      return next;
    });
  }, [defaultSort, storageKey]);

  const resetSort = useCallback(() => {
    persistSort(storageKey, defaultSort, defaultSort);
    setSortState(defaultSort);
  }, [defaultSort, storageKey]);

  return {
    sort,
    setSort,
    resetSort,
    isDefaultSort: sortsMatch(sort, defaultSort),
  };
}
