import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { STORAGE_KEYS } from "./storageKeys";

type FilterValue = string | boolean | string[];

/** Keeps only the stored keys whose type matches the default, so an old or tampered entry can't break the list. */
export function readStoredFilters<T extends Record<string, FilterValue>>(raw: string | null, defaults: T): T {
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") return defaults;
    const result: Record<string, FilterValue> = { ...defaults };
    for (const [key, fallback] of Object.entries(defaults)) {
      const value = parsed[key];
      if (Array.isArray(fallback)) {
        if (Array.isArray(value) && value.every((item) => typeof item === "string")) result[key] = value;
      } else if (typeof value === typeof fallback) {
        result[key] = value as FilterValue;
      }
    }
    return result as T;
  } catch {
    return defaults;
  }
}

/** Filters (and the drawer state) of a list, remembered between sessions (Andrea, 08/10). */
export function usePersistentFilters<T extends Record<string, FilterValue>>(
  storageId: string,
  defaults: T,
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `${STORAGE_KEYS.listFiltersPrefix}.${storageId}`;
  const [filters, setFiltersState] = useState<T>(() => {
    try {
      return readStoredFilters(window.localStorage.getItem(storageKey), defaults);
    } catch {
      return defaults;
    }
  });
  const setFilters: Dispatch<SetStateAction<T>> = useCallback((action) => {
    setFiltersState((current) => {
      const next = typeof action === "function" ? action(current) : action;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ponytail: blocked storage only forgets the filters.
      }
      return next;
    });
  }, [storageKey]);
  return [filters, setFilters];
}

export function toggleValue(values: readonly string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
