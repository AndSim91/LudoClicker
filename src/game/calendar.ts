const GAME_MONTH_NAMES = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
] as const;
const SCHOOL_YEAR_START_MONTH = 9;
const FORM_TRAINING_YEAR_START_MONTH = 7;

export function getGameMonthName(currentMonth: number): string {
  const normalizedMonth = Math.max(1, Math.floor(currentMonth));
  return GAME_MONTH_NAMES[(normalizedMonth - 1) % GAME_MONTH_NAMES.length];
}

export function getGameYear(currentMonth: number): number {
  const normalizedMonth = Math.max(1, Math.floor(currentMonth));
  return Math.floor((normalizedMonth - 1) / GAME_MONTH_NAMES.length) + 1;
}

/** January–August of the first calendar year are school year 0 (08/10/2026). */
export function getSchoolYear(currentMonth: number): number {
  const normalizedMonth = Math.max(1, Math.floor(currentMonth));
  return Math.max(
    0,
    Math.floor((normalizedMonth - SCHOOL_YEAR_START_MONTH) / GAME_MONTH_NAMES.length) + 1,
  );
}

/** January–June of the first calendar year are training year 0, so a Forma learned then does not block the next July. */
export function getFormTrainingYear(currentMonth: number): number {
  const normalizedMonth = Math.max(1, Math.floor(currentMonth));
  return Math.max(
    0,
    Math.floor((normalizedMonth - FORM_TRAINING_YEAR_START_MONTH) / GAME_MONTH_NAMES.length) + 1,
  );
}

export function getSchoolYearStartMonth(schoolYear: number): number {
  const normalizedYear = Math.max(1, Math.floor(schoolYear));
  return SCHOOL_YEAR_START_MONTH + (normalizedYear - 1) * GAME_MONTH_NAMES.length;
}

export function isSummerBreak(currentMonth: number): boolean {
  const monthIndex = (Math.max(1, Math.floor(currentMonth)) - 1) % GAME_MONTH_NAMES.length;
  return monthIndex === 6 || monthIndex === 7;
}

export function isSchoolYearDepartureMonth(currentMonth: number): boolean {
  const monthIndex = (Math.max(1, Math.floor(currentMonth)) - 1) % GAME_MONTH_NAMES.length;
  return monthIndex === 5;
}

/** 1 = Gennaio … 12 = Dicembre. */
export function getCalendarMonth(currentMonth: number): number {
  return ((Math.max(1, Math.floor(currentMonth)) - 1) % GAME_MONTH_NAMES.length) + 1;
}
