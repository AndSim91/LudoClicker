import { GAME_CONFIG } from "../config";
import type { MigratableState } from "./types";

/*
 * v91, Rete delle Onde as a page with a map: a school left behind keeps only
 * name, city and Fama (unknown before now); the count and the rent become two
 * numbers of the network; the map keeps the Sede madre and the latest schools.
 * Specialization and motto are gone. Reputation: Lezioni di prova is gone
 * (its points come back to spend), Capacità di miglioramento becomes Genetica.
 */
export function migrateNetworkMapState(state: MigratableState): MigratableState {
  if (state.version !== 90) return state;
  const network = state.network;
  const school = state.school ? { ...state.school } : undefined;
  delete school?.motto;
  delete school?.specialization;
  if (!network) return { ...state, version: 91, school };
  const schools = network.schools ?? [];
  const { trialBooking = 0, athleticPreparation, ...upgrades } = network.reputationUpgrades ?? {};
  const limit = GAME_CONFIG.networkMapSchoolsLimit;
  const mapped = schools.map(({ name, city }) => ({ name, city }));
  return {
    ...state,
    version: 91,
    school,
    network: {
      ...network,
      reputation: (network.reputation ?? 0) + trialBooking,
      reputationUpgrades: athleticPreparation ? { ...upgrades, genetics: athleticPreparation } : upgrades,
      schools: mapped.length > limit ? [mapped[0], ...mapped.slice(-(limit - 1))] : mapped,
      schoolCount: schools.length,
      monthlyRent: schools.reduce((total, entry) => total + (entry.monthlyRent ?? 0), 0),
    },
  };
}
