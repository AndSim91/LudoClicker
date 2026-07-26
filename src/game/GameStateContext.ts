import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { GameState } from "./types";

export const GameStateContext = createContext<GameState | null>(null);

interface GameStateStore {
  getState(): GameState;
  subscribe(listener: () => void): () => void;
  publish(state: GameState): void;
  notify(): void;
}

const GameStateStoreContext = createContext<GameStateStore | null>(null);
const emptySubscribe = () => () => undefined;

function createGameStateStore(initialState: GameState): GameStateStore {
  let state = initialState;
  let notifiedState = initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    publish(nextState) {
      state = nextState;
    },
    notify() {
      if (notifiedState === state) return;
      notifiedState = state;
      for (const listener of listeners) listener();
    },
  };
}

/**
 * Pubblica lo stato tramite uno store stabile: cambiare un tick non modifica il
 * valore del Context e vengono svegliati soltanto i selector realmente cambiati.
 */
export function GameStateProvider({
  state,
  children,
}: {
  state: GameState;
  children: ReactNode;
}) {
  const [store] = useState(() => createGameStateStore(state));
  useLayoutEffect(() => {
    store.publish(state);
    store.notify();
  }, [state, store]);
  return createElement(GameStateStoreContext.Provider, { value: store }, children);
}

export function useOptionalGameState(): GameState | null {
  const contextState = useContext(GameStateContext);
  const store = useContext(GameStateStoreContext);
  const subscribe = !contextState && store ? store.subscribe : emptySubscribe;
  const getSnapshot = useCallback(
    () => contextState ?? store?.getState() ?? null,
    [contextState, store],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/* eslint-disable react-hooks/immutability -- The snapshot cache is private to
 * useSyncExternalStore and must retain the last equal value between notifications. */
export function useGameSelector<Selection>(
  selector: (state: GameState) => Selection,
  override?: GameState,
  isEqual: (left: Selection, right: Selection) => boolean = Object.is,
): Selection {
  const contextState = useContext(GameStateContext);
  const store = useContext(GameStateStoreContext);
  const subscribe = !override && !contextState && store
    ? store.subscribe
    : emptySubscribe;
  const getSnapshot = useMemo(() => {
    let hasValue = false;
    let selectedValue: Selection;
    return () => {
      const state = override ?? contextState ?? store?.getState();
      if (!state) {
        throw new Error(
          "Game state is unavailable: render inside GameStateProvider or provide state.",
        );
      }
      const nextSelection = selector(state);
      if (hasValue && isEqual(selectedValue, nextSelection)) return selectedValue;
      hasValue = true;
      selectedValue = nextSelection;
      return nextSelection;
    };
  }, [contextState, isEqual, override, selector, store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
/* eslint-enable react-hooks/immutability */

/**
 * Compatibilita per i componenti non ancora specializzati e per i test con
 * override. I consumer critici dovrebbero preferire useGameSelector.
 */
export function useGameState(override?: GameState): GameState {
  return useGameSelector((state) => state, override);
}

export function useGameStateSlices(
  keys: readonly (keyof GameState)[],
  override?: GameState,
): GameState {
  return useGameSelector(
    (state) => state,
    override,
    (left, right) => keys.every((key) => left[key] === right[key]),
  );
}
