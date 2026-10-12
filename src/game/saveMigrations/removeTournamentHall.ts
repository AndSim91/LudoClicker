import type { MigratableState } from "./types";

/*
 * v111 (12/10/2026): via l'Albo d'oro dei tornei (Andrea), per alleggerire il
 * salvataggio. Se era l'unica traccia del primo Scolastico, la tiene in
 * firstSchoolTournamentMonth (sblocca la Pianificazione delle Onde).
 */
export function migrateRemoveTournamentHallState(state: MigratableState): MigratableState {
  if (state.version !== 110) return state;
  if (!state.tournaments) return { ...state, version: 111 };
  const { hall, ...tournaments } = state.tournaments as typeof state.tournaments & {
    hall?: { level?: string }[];
  };
  const schoolOnlyInHall = tournaments.firstSchoolTournamentMonth === undefined &&
    Array.isArray(hall) && hall.some((entry) => entry?.level === "school") &&
    !tournaments.results?.some((result) => result.level === "school");
  return {
    ...state,
    version: 111,
    tournaments: {
      ...tournaments,
      ...(schoolOnlyInHall ? { firstSchoolTournamentMonth: state.school?.currentMonth ?? 0 } : {}),
    },
  };
}
