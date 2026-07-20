import { createStableFallbackStats } from "../athleteStats";
import { createSecretLegendaryProgress } from "../legendaryAvailability";
import type { GameState } from "../types";
import type { MigratableState } from "./types";

export function migrateTournamentState(state: MigratableState): MigratableState {
  if (state.version !== 36) return state;
  return {
    ...state,
    version: 37,
    contacts: (state.contacts ?? []).map((contact) => {
      const stats = createStableFallbackStats(contact.id, contact.rarity, contact.specialProfileId);
      return {
        ...contact,
        arenaBase: contact.arenaBase ?? stats.arena,
        styleBase: contact.styleBase ?? stats.style,
        tournamentExperience: contact.tournamentExperience ?? 0,
      };
    }),
    tournaments: {
      results: [],
      missedTournaments: [],
      immuneContactIds: [],
      skippedSeasons: [],
      championsVictoryCurrentSchool: false,
    },
    network: state.network ? {
      ...state.network,
      secretLegendaries: createSecretLegendaryProgress(),
    } : state.network,
    historyArchive: state.historyArchive
      ? {
          ...state.historyArchive,
          contactsBySource: {
            ...state.historyArchive.contactsBySource,
            tournament: { total: 0, enrolled: 0 },
          } as GameState["historyArchive"]["contactsBySource"],
        }
      : state.historyArchive,
  };
}
