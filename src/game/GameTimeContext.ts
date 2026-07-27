import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

export interface GameTimeSource {
  getNow: () => number;
  getWallNow: () => number;
  isPaused: boolean;
  speed: number;
}

export const GameTimeContext = createContext<GameTimeSource | null>(null);

interface ClockStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
}

const clockStores = new Map<number, ClockStore>();
const subscribeToStaticClock = () => () => undefined;
const getStaticSnapshot = () => 0;

function getClockStore(intervalMs: number): ClockStore {
  const normalizedInterval = Math.max(16, Math.round(intervalMs));
  const existing = clockStores.get(normalizedInterval);
  if (existing) return existing;

  const listeners = new Set<() => void>();
  let now = 0;
  let timer: number | undefined;
  const store: ClockStore = {
    subscribe: (listener) => {
      listeners.add(listener);
      if (timer === undefined) {
        now = Date.now();
        timer = window.setInterval(() => {
          now = Date.now();
          listeners.forEach((notify) => notify());
        }, normalizedInterval);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== undefined) {
          window.clearInterval(timer);
          timer = undefined;
        }
      };
    },
    getSnapshot: () => now,
  };
  clockStores.set(normalizedInterval, store);
  return store;
}

export function useGameTimeSource(): GameTimeSource | null {
  return useContext(GameTimeContext);
}

export function useGameTime(active: boolean, intervalMs: number): number {
  const source = useGameTimeSource();
  const wallNow = useWallTime(active && !source?.isPaused, intervalMs);
  return source ? source.getNow() : wallNow;
}

/** A shared real-time clock for UI that must keep moving while the game is paused. */
export function useWallTime(active: boolean, intervalMs: number): number {
  const store = getClockStore(intervalMs);
  const wallNow = useSyncExternalStore(
    active ? store.subscribe : subscribeToStaticClock,
    active ? store.getSnapshot : getStaticSnapshot,
    getStaticSnapshot,
  );
  return wallNow;
}

/** A real-time clock that stops notifying immediately after an absolute deadline. */
export function useWallTimeUntil(
  deadline: number | undefined,
  intervalMs: number,
  active = true,
): number {
  const store = getClockStore(intervalMs);
  const subscribeUntilDeadline = useCallback((listener: () => void) => {
    if (!active || deadline === undefined) return subscribeToStaticClock();

    let unsubscribe: () => void = () => undefined;
    unsubscribe = store.subscribe(() => {
      listener();
      if (store.getSnapshot() >= deadline) unsubscribe();
    });
    if (store.getSnapshot() >= deadline) unsubscribe();
    return unsubscribe;
  }, [active, deadline, store]);

  return useSyncExternalStore(
    !active || deadline === undefined ? subscribeToStaticClock : subscribeUntilDeadline,
    !active || deadline === undefined ? getStaticSnapshot : store.getSnapshot,
    getStaticSnapshot,
  );
}
