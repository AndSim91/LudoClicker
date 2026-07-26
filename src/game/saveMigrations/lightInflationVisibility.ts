import { LIGHT_INFLATION_EVENT_VISIBILITY_MS } from "../lightInflation";
import type { MigratableState } from "./types";

export function migrateLightInflationVisibilityState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 63) return state;

  const event = state.lightInflation?.event;
  return {
    ...state,
    version: 64,
    lightInflation: state.lightInflation && event
      ? {
          ...state.lightInflation,
          event: {
            ...event,
            visibleUntil: event.occurredAt + LIGHT_INFLATION_EVENT_VISIBILITY_MS,
          },
        }
      : state.lightInflation,
  };
}
