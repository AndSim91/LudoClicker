import { GAME_CONFIG } from "../config";

// Share used by the v85 rents; v86 replaced them with the Reputation rent.
const V85_NETWORK_RENT_SHARE = 0.25;
import type { MigratableState } from "./types";

/** Schools founded before the rents existed pay 25% of a plain fee per member at transfer. */
export function migrateNetworkRentState(state: MigratableState): MigratableState {
  if (state.version !== 84) return state;
  return {
    ...state,
    version: 85,
    network: state.network
      ? {
          ...state.network,
          schools: (state.network.schools ?? []).map((school) => school.monthlyRent === undefined
            ? {
                ...school,
                monthlyRent: Math.round(
                  (school.membersAtTransfer ?? 0) * GAME_CONFIG.monthlyMemberFee * V85_NETWORK_RENT_SHARE,
                ),
              }
            : school),
        }
      : state.network,
  };
}
