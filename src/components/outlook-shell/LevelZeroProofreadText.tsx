import type { ReactNode } from "react";
import { getLevelZeroProofreadingErrorRanges } from "../../content/levelZeroProofreading";

export function LevelZeroProofreadText({
  text,
  typos,
  revealedCharacters = text.length,
  showCaret = false,
}: {
  text: string;
  /** Positions saved with the email; older saves fall back to the legacy word list. */
  typos?: [number, number][];
  revealedCharacters?: number;
  showCaret?: boolean;
}) {
  const visibleLength = Math.max(0, Math.min(text.length, revealedCharacters));
  const ranges = typos
    ? typos.map(([start, end]) => ({ start, end }))
    : getLevelZeroProofreadingErrorRanges(text);
  const content: ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range) => {
    if (range.end > visibleLength) return;
    if (range.start > cursor) {
      content.push(text.slice(cursor, Math.min(range.start, visibleLength)));
    }
    content.push(
      <span
        key={`${range.start}-${range.end}`}
        className="level-zero-grammar-error"
        title="Possibile errore grammaticale"
      >
        {text.slice(range.start, range.end)}
      </span>,
    );
    cursor = range.end;
  });

  if (cursor < visibleLength) content.push(text.slice(cursor, visibleLength));

  return (
    <>
      {content}
      {showCaret ? <i className="text-caret" /> : null}
    </>
  );
}
