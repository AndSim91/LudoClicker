import { createInitialGadgetMonthlyRevenueState } from "../gadgetRevenue";
import type { MigratableState } from "./types";

export function migrateGadgetMonthlyRevenueState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 78) return state;
  if (!state.gadgets) return { ...state, version: 79 };
  const currentMonth = Number.isSafeInteger(state.school?.currentMonth)
    ? Math.max(1, state.school!.currentMonth as number)
    : 9;
  return {
    ...state,
    version: 79,
    gadgets: {
      ...state.gadgets,
      monthlyRevenue: createInitialGadgetMonthlyRevenueState(currentMonth),
    },
  };
}
