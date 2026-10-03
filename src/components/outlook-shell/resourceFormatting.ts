// Explicit options: ICU versions disagree on grouping 4-digit numbers and on the
// minimum fraction digits of compact currencies (piano 6.2).
const compactNumber = new Intl.NumberFormat("it-IT", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
  useGrouping: true,
});

const compactCurrency = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  compactDisplay: "short",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const exactNumber = new Intl.NumberFormat("it-IT", { useGrouping: true });
const exactCurrency = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  useGrouping: true,
});

export function formatCompactNumber(value: number): string {
  return compactNumber.format(value);
}

export function formatCompactCurrency(value: number): string {
  return compactCurrency.format(value);
}

export function formatExactNumber(value: number): string {
  return exactNumber.format(value);
}

export function formatExactCurrency(value: number): string {
  return exactCurrency.format(value);
}
