import type { MigratableState } from "./types";

/*
 * v117 (15/10/2026): after a foundation the Inflazione di Luce started from
 * `eurosEarnedAtCheck: 0` while `statistics.eurosEarned` is a career total, so the
 * first September check read the whole career as this year's wealth (+100%).
 * Schools founded before the fix and not yet past their first check start from
 * the career total at the start of this school year.
 */
export function migrateLightInflationFoundationState(state: MigratableState): MigratableState {
  if (state.version !== 116) return state;
  const inflation = state.lightInflation;
  const yearStart = (state.annual as { ledger?: { start?: { eurosEarned?: number } } } | undefined)
    ?.ledger?.start?.eurosEarned;
  if (
    !inflation ||
    inflation.eurosEarnedAtCheck !== 0 ||
    (state.network?.schoolCount ?? 0) < 1 ||
    typeof yearStart !== "number"
  ) {
    return { ...state, version: 117 };
  }
  return { ...state, version: 117, lightInflation: { ...inflation, eurosEarnedAtCheck: yearStart } };
}
