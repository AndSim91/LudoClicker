import { getSchoolYear } from "../calendar";
import { didWinBothNationalDisciplines } from "../reptileUnlock";
import type { MigratableState } from "./types";

export function migrateReptileState(state: MigratableState): MigratableState {
  if (state.version !== 71) return state;
  const currentMonth = state.school?.currentMonth ?? 9;
  return {
    ...state,
    version: 72,
    tournaments: state.tournaments
      ? {
          ...state.tournaments,
          reptile: {
            unlocked: (state.tournaments.results ?? []).some(didWinBothNationalDisciplines),
            fameXp: 0,
            victories: 0,
            nextPreparationSchoolYear: getSchoolYear(currentMonth),
            hall: [],
          },
        }
      : state.tournaments,
  };
}
