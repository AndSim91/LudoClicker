import { getCalendarMonth, getSchoolYear, getSchoolYearStartMonth } from "../../game/calendar";
import { getTournamentSchoolYear } from "../../game/tournamentHistory";
import type {
  GameState,
  ReptileTournamentResult,
  TournamentLevel,
  TournamentResult,
} from "../../game/types";
import {
  findUpcomingTournament,
  getResultForLevelAndSeason,
  type UpcomingTournament,
} from "./tournamentPresentation";

/** One row of the Tornei calendar: a tournament of a school year (September–August). */
export type YearEntryLevel = TournamentLevel | "reptile";
export type YearEntryStatus = "done" | "next" | "wait" | "out";

export interface YearEntry {
  /** `${schoolYear}:${level}`, stable across renders. */
  key: string;
  level: YearEntryLevel;
  schoolYear: number;
  /** 11, 12, 4, 6, 7; 0 for Chronicles (played whenever). */
  calendarMonth: number;
  status: YearEntryStatus;
  /** Ordinary circuit and Chronicles. */
  result?: TournamentResult;
  /** Torneo Reptile. */
  reptileResult?: ReptileTournamentResult;
  upcoming?: UpcomingTournament;
}

export interface TournamentYearView {
  schoolYear: number;
  entries: YearEntry[];
  /** Only while nothing has been played in the current school year (10/10/2026). */
  previous?: { schoolYear: number; entries: YearEntry[] };
}

type YearState = Pick<GameState, "school" | "tournaments">;

/** Ordinary circuit of a school year: November closes the previous season, December opens the new one. */
const CIRCUIT: { level: Exclude<TournamentLevel, "chronicles">; monthOffset: number; seasonOffset: number }[] = [
  { level: "champions", monthOffset: 2, seasonOffset: -1 },
  { level: "school", monthOffset: 3, seasonOffset: 0 },
  { level: "academy", monthOffset: 7, seasonOffset: 0 },
  { level: "national", monthOffset: 9, seasonOffset: 0 },
];
const PREVIOUS_LEVEL: Partial<Record<TournamentLevel, TournamentLevel>> = {
  academy: "school",
  national: "academy",
  champions: "national",
};

function isProcessed(state: YearState, level: TournamentLevel, season: number): boolean {
  return Boolean(getResultForLevelAndSeason(state.tournaments.results, level, season)) ||
    state.tournaments.missedTournaments.some((entry) => entry.level === level && entry.season === season);
}

/** The July of an organized Reptile edition: the first July from the month it was organized. */
function reptileJuly(organizedMonth: number): number {
  let month = organizedMonth;
  while (getCalendarMonth(month) !== 7) month += 1;
  return month;
}

export function getSchoolYearTournaments(state: YearState, schoolYear: number): YearEntry[] {
  if (schoolYear < 1) return [];
  const start = getSchoolYearStartMonth(schoolYear);
  const current = state.school.currentMonth;
  const upcoming = findUpcomingTournament(state as GameState);
  const qualification = state.tournaments.qualification;
  const entries: YearEntry[] = [];

  for (const { level, monthOffset, seasonOffset } of CIRCUIT) {
    const season = schoolYear + seasonOffset;
    if (season < 1) continue;
    const month = start + monthOffset;
    const base = { key: `${schoolYear}:${level}`, level, schoolYear, calendarMonth: getCalendarMonth(month) };
    const result = getResultForLevelAndSeason(state.tournaments.results, level, season);
    if (result) {
      entries.push({ ...base, status: "done", result });
      continue;
    }
    if (upcoming?.level === level && upcoming.season === season) {
      entries.push({ ...base, status: "next", upcoming });
      continue;
    }
    const missed = state.tournaments.missedTournaments.some((entry) => entry.level === level && entry.season === season);
    const previous = PREVIOUS_LEVEL[level];
    // No qualifier after the previous step: the tournament will be played without us.
    const noQualifier = previous !== undefined &&
      isProcessed(state, previous, season) &&
      !(qualification?.level === level && qualification.season === season);
    const past = month < current;
    entries.push({ ...base, status: missed || past || noQualifier ? "out" : "wait" });
  }

  const reptile = state.tournaments.reptile;
  if (reptile.latestRecap?.schoolYear === schoolYear) {
    entries.push({
      key: `${schoolYear}:reptile`,
      level: "reptile",
      schoolYear,
      calendarMonth: 7,
      status: "done",
      reptileResult: reptile.latestRecap,
    });
  } else if (reptile.activeEdition && getSchoolYear(reptileJuly(reptile.activeEdition.organizedMonth)) === schoolYear) {
    entries.push({ key: `${schoolYear}:reptile`, level: "reptile", schoolYear, calendarMonth: 7, status: "wait" });
  }

  const chronicles = [...state.tournaments.results]
    .reverse()
    .find((result) => result.level === "chronicles" && getTournamentSchoolYear(result) === schoolYear);
  if (chronicles) {
    entries.push({ key: `${schoolYear}:chronicles`, level: "chronicles", schoolYear, calendarMonth: 0, status: "done", result: chronicles });
  }
  return entries;
}

/** Months of the school year in calendar order, for sorting rows (Chronicles last). */
export const YEAR_MONTH_ORDER = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8];

export function getTournamentYearView(state: YearState): TournamentYearView {
  const schoolYear = Math.max(1, getSchoolYear(state.school.currentMonth));
  const entries = getSchoolYearTournaments(state, schoolYear);
  if (entries.some((entry) => entry.status === "done") || schoolYear <= 1) return { schoolYear, entries };
  const previousEntries = getSchoolYearTournaments(state, schoolYear - 1);
  return previousEntries.some((entry) => entry.status === "done")
    ? { schoolYear, entries, previous: { schoolYear: schoolYear - 1, entries: previousEntries } }
    : { schoolYear, entries };
}

/** Rows that can be opened in Risultati: the played ones. */
export function getPlayedEntries(view: TournamentYearView): YearEntry[] {
  return [...view.entries, ...(view.previous?.entries ?? [])].filter((entry) => entry.status === "done");
}

/** What the panel shows first: the latest result (of the previous year when shown), else the next tournament. */
export function getDefaultEntry(view: TournamentYearView): YearEntry | undefined {
  const pool = view.previous ? view.previous.entries : view.entries;
  return [...pool].reverse().find((entry) => entry.status === "done") ??
    view.entries.find((entry) => entry.status === "next") ??
    view.entries[0];
}

export function findEntry(view: TournamentYearView, key: string | undefined): YearEntry | undefined {
  if (!key) return undefined;
  return [...view.entries, ...(view.previous?.entries ?? [])].find((entry) => entry.key === key);
}

export const YEAR_ENTRY_LABEL: Record<YearEntryLevel, string> = {
  champions: "Champion's Arena",
  school: "Torneo Scolastico",
  academy: "Torneo Accademico Alpha",
  national: "Torneo Nazionale",
  reptile: "Torneo Reptile",
  chronicles: "Chronicles of Ludosport",
};

export const YEAR_ENTRY_SHORT: Record<YearEntryLevel, string> = {
  champions: "Champion's",
  school: "Scolastico",
  academy: "Accademico",
  national: "Nazionale",
  reptile: "Reptile",
  chronicles: "Chronicles",
};
