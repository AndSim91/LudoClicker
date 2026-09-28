import { GAME_CONFIG } from "../config";
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
                  school.membersAtTransfer * GAME_CONFIG.monthlyMemberFee * GAME_CONFIG.networkRentShare,
                ),
              }
            : school),
        }
      : state.network,
  };
}
