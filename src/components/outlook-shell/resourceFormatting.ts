// Explicit options: ICU versions disagree on grouping 4-digit numbers and on the
// minimum fraction digits of compact currencies (piano 6.2).
const compactNumber = new Intl.NumberFormat("it-IT", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
  useGrouping: true,
});

const compactMantissa = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1, useGrouping: true });

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

// Italian CLDR has no short form for thousands («1200», «15.400»), so the sidebar
// would grow back to the exact value; K is spelled out by hand, Mln/Mld follow ICU.
// 999.950 already reads «1 Mln», like 999,95 rounds to 1.
const COMPACT_UNITS = [
  [1e9, " Mld"],
  [1e6, " Mln"],
  [1e3, "K"],
] as const;

export function formatCompactNumber(value: number): string {
  const magnitude = Math.abs(value);
  for (const [size, suffix] of COMPACT_UNITS) {
    if (magnitude >= size * 0.99995) return `${compactMantissa.format(value / size)}${suffix}`;
  }
  return compactNumber.format(value);
}

// Fondi in the title bar always keep one decimal («139,0K €»), so the figure stays the
// same width while it rolls and fits its 7ch slot up to «9,9 Mln €» (Andrea 15/10).
const balanceMantissa = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatCompactBalance(value: number): string {
  const magnitude = Math.abs(value);
  for (const [size, suffix] of COMPACT_UNITS) {
    if (magnitude >= size * 0.99995) return `${balanceMantissa.format(value / size)}${suffix} €`;
  }
  return `${exactNumber.format(Math.round(value))} €`;
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
