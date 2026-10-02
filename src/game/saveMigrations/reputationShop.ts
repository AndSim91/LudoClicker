import type { MigratableState } from "./types";

/*
 * v86, Reputazione di rete (6.19): the reputation earned so far becomes points
 * to spend at the next foundation; the old automatic rents stop, since the rent
 * is now bought with Reputation. The Fama is reset only at the next prestige.
 */
export function migrateReputationShopState(state: MigratableState): MigratableState {
  if (state.version !== 85) return state;
  return {
    ...state,
    version: 86,
    network: state.network
      ? {
          ...state.network,
          reputationUpgrades: {},
          schools: (state.network.schools ?? []).map((school) => ({ ...school, monthlyRent: 0 })),
        }
      : state.network,
  };
}
