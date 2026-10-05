import type { MigratableState } from "./types";

/* v101: the Gadget laboratory has benches (Multitasking): the one work becomes a list. */
export function migrateGadgetBenchesState(state: MigratableState): MigratableState {
  if (state.version !== 100) return state;
  const gadgets = state.gadgets as (MigratableState["gadgets"] & { activeWork?: unknown }) | undefined;
  if (!gadgets) return { ...state, version: 101 };
  const { activeWork, ...rest } = gadgets;
  return {
    ...state,
    version: 101,
    gadgets: { ...rest, activeWorks: activeWork ? [activeWork] : [] } as MigratableState["gadgets"],
  };
}
