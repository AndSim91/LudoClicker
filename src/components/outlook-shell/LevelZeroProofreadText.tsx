import type { ReactNode } from "react";

interface GrammarErrorRange {
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
] as const;

function getGrammarErrorRanges(text: string): GrammarErrorRange[] {
  const ranges = LEVEL_ZERO_GRAMMAR_ERRORS.flatMap((pattern) =>
    Array.from(text.matchAll(pattern), (match) => ({
      start: match.index,
      end: match.index + match[0].length,
    })),
  ).sort((left, right) => left.start - right.start || left.end - right.end);

  return ranges.reduce<GrammarErrorRange[]>((merged, range) => {
    const previous = merged.at(-1);
    if (!previous || range.start > previous.end) {
      merged.push(range);
    } else {
      previous.end = Math.max(previous.end, range.end);
    }
    return merged;
  }, []);
}

export function LevelZeroProofreadText({
  text,
  revealedCharacters = text.length,
  showCaret = false,
}: {
  text: string;
  revealedCharacters?: number;
  showCaret?: boolean;
}) {
  const visibleLength = Math.max(0, Math.min(text.length, revealedCharacters));
  const ranges = getGrammarErrorRanges(text);
  const content: ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range) => {
    if (range.start >= visibleLength) return;
    if (range.start > cursor) {
      content.push(text.slice(cursor, Math.min(range.start, visibleLength)));
    }
    const end = Math.min(range.end, visibleLength);
    content.push(
      <span
        key={`${range.start}-${range.end}`}
        className="level-zero-grammar-error"
        title="Possibile errore grammaticale"
      >
        {text.slice(range.start, end)}
      </span>,
    );
    cursor = end;
  });

  if (cursor < visibleLength) content.push(text.slice(cursor, visibleLength));

  return (
    <>
      {content}
      {showCaret ? <i className="text-caret" /> : null}
    </>
  );
}
