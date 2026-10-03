// Explicit options: ICU versions disagree on grouping 4-digit numbers ("5000"
// in Node, "5.000" in Chrome) and on the minimum fraction digits of compact
// currencies (piano 6.2).
const currencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  useGrouping: true,
});
const compactCurrencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  compactDisplay: "short",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  dateStyle: "medium",
  timeStyle: "short",
});
const dateFormatter = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" });
const clockFormatter = new Intl.DateTimeFormat("it-IT", { timeStyle: "medium" });
const longDateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const percentFormatter = new Intl.NumberFormat("it-IT", {
  style: "percent",
  maximumFractionDigits: 2,
});

const wholeCurrencyFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  useGrouping: true,
  maximumFractionDigits: 0,
});
const statFormatter = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: true });
const voteFormatter = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Cents only below 10.000 €: above that they are noise (Fase 8). */
export function formatCurrency(value: number): string {
  return (Math.abs(value) >= 10_000 ? wholeCurrencyFormatter : currencyFormatter).format(value);
}

const listFormatter = new Intl.ListFormat("it-IT", { type: "conjunction" });

/** «a, b e c». */
export function formatList(items: readonly string[]): string {
  return listFormatter.format(items);
}

/** Arena and Stile values are shown as whole numbers: 1.822, not 1822.400. */
export function formatStat(value: number): string {
  return statFormatter.format(value);
}

/** A judge's Stile vote, 0–10, with two decimals: 7,35. */
export function formatVote(value: number): string {
  return voteFormatter.format(value);
}

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value);
}

export function formatTime(value: number): string {
  return timeFormatter.format(value);
}

export function formatDateTime(value: number): string {
  return dateTimeFormatter.format(value);
}

export function formatDate(value: number): string {
  return dateFormatter.format(value);
}

export function formatClock(value: number): string {
  return clockFormatter.format(value);
}

export function formatLongDate(value: number): string {
  return longDateFormatter.format(value);
}

export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}
