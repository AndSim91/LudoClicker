import { createContext, useContext, useSyncExternalStore } from "react";

export interface GameTimeSource {
  getNow: () => number;
  isPaused: boolean;
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
  const store = getClockStore(intervalMs);
  const subscribed = active && !source?.isPaused;
  const wallNow = useSyncExternalStore(
    subscribed ? store.subscribe : subscribeToStaticClock,
    subscribed ? store.getSnapshot : getStaticSnapshot,
    getStaticSnapshot,
  );
  if (source?.isPaused) return source.getNow();
  return wallNow;
}
