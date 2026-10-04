import type { MigratableState } from "./types";

/*
 * v94: the Reputation branch "Quote mensili" becomes "Social e Gadget"
 * (follower and gadget income). Points already spent move to the new branch.
 */
export function migrateSocialGadgetsReputationState(state: MigratableState): MigratableState {
  if (state.version !== 93) return state;
  const { membershipFees, ...upgrades } = state.network?.reputationUpgrades ?? {};
  if (!state.network || membershipFees === undefined) return { ...state, version: 94 };
  return {
    ...state,
    version: 94,
    network: { ...state.network, reputationUpgrades: { ...upgrades, socialGadgets: membershipFees } },
  };
}
