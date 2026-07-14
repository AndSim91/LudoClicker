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

export function getGameMonthName(currentMonth: number): string {
  const normalizedMonth = Math.max(1, Math.floor(currentMonth));
  return GAME_MONTH_NAMES[(normalizedMonth - 1) % GAME_MONTH_NAMES.length];
}

export function getGameYear(currentMonth: number): number {
  const normalizedMonth = Math.max(1, Math.floor(currentMonth));
  return Math.floor((normalizedMonth - 1) / GAME_MONTH_NAMES.length) + 1;
}
