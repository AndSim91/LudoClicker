import type { MigratableState } from "./types";

/*
 * v99: buying swords now needs the Fornitore ufficiale node (Attrezzatura).
 * Saves that had already opened the supplier under the old rule (15 members
 * at peak, or more than the 6 starting swords) receive the node for free.
 */
export function migrateOfficialSupplierState(state: MigratableState): MigratableState {
  if (state.version !== 98) return state;
  const opened = (state.school?.peakActiveMembers ?? 0) >= 15 ||
    (state.equipment?.totalSwords ?? 0) > 6;
  if (!opened) return { ...state, version: 99 };
  return { ...state, version: 99, upgrades: { ...state.upgrades, "official-supplier": 1 } };
}
