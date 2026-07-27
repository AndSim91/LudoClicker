import { useCallback, useSyncExternalStore } from "react";

const subscribeToStaticMediaQuery = () => () => undefined;

function readMediaQuery(query: string, fallback: boolean): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return fallback;
  }
  return window.matchMedia(query).matches;
}

/**
 * Subscribes to the boolean result of a media query, so resizing within the
 * same responsive range does not cause React renders.
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback((listener: () => void) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return subscribeToStaticMediaQuery();
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = () => listener();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);
  const getSnapshot = useCallback(
    () => readMediaQuery(query, fallback),
    [fallback, query],
  );
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  return useSyncExternalStore(
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? subscribeToStaticMediaQuery
      : subscribe,
    getSnapshot,
    getServerSnapshot,
  );
}
