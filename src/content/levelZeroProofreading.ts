// Legacy: underlines level 0 emails saved before the errors were generated with
// their positions (levelZeroTypos.ts). Do not extend: new errors go in TYPOS.
export interface ProofreadingErrorRange {
  start: number;
  end: number;
}

const LEVEL_ZERO_GRAMMAR_ERRORS = [
  /\bprovore\b/giu,
  /\bUdosport\b/gu,
  /\bfiga\b/giu,
  /\bdivertenta\b/giu,
  /\bapparte\b/giu,
  /\b(?:perchè|finchè|purchè)(?!\p{L})/giu,
  /\bpò(?!\p{L})/giu,
  /\bc['’]è l['’]hanno\b/giu,
  /\bcontrolla\b(?=\s+te\b)/giu,
  /\bsi ricarica\b(?=\s+con\b)/giu,
  /\bnon sbriciolano\b/giu,
  /\burgentino\b/giu,
  /\bera\b(?=\s+tutto calcolato\b)/giu,
  /\bnecessita\b(?=\s+spade\b)/giu,
  /\bFuture\b(?=\s+scuole\b)/gu,
  /\bli abbiamo chiesto\b/giu,
  /\busa\b(?=,?\s+possibilmente\b)/giu,
  /\bvieni\b(?=\.\s+Se non rispondi\b)/giu,
  /\bportare\b(?=\s+biscotti\b)/giu,
  /\b(?:Ciaoo|palestrra|proova|spadde|spadda|grupoo|lezzione|gratiss|sporrt|movimmento|movimmenti|sicureza|esperiensa|primma|vienni|perssone|perssona|allenamneto|esercizzi|materialle|curiosita|inparare|abiamo|qesta|tuto|ance|sollo|senpre|qundo|sensa|minnuti|menntre|calccoli|vestitti|principanti|statitiche|commisione|uficiale|mettodo|protezzioni)\b/giu,
] as const;

export function getLevelZeroProofreadingErrorRanges(
  text: string,
): ProofreadingErrorRange[] {
  const ranges = LEVEL_ZERO_GRAMMAR_ERRORS.flatMap((pattern) =>
    Array.from(text.matchAll(pattern), (match) => ({
      start: match.index,
      end: match.index + match[0].length,
    })),
  ).sort((left, right) => left.start - right.start || left.end - right.end);

  return ranges.reduce<ProofreadingErrorRange[]>((merged, range) => {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) {
      merged.push(range);
    } else {
      previous.end = Math.max(previous.end, range.end);
    }
    return merged;
  }, []);
}

export function hasLevelZeroProofreadingError(text: string): boolean {
  return getLevelZeroProofreadingErrorRanges(text).length > 0;
}
