export interface RevealSection {
  text: string;
  start: number;
}

export function RevealedText({
  section,
  revealedCharacters,
  showCaret,
}: {
  section: RevealSection;
  revealedCharacters: number;
  showCaret: boolean;
}) {
  const visibleCount = Math.max(
    0,
    Math.min(section.text.length, revealedCharacters - section.start),
  );
  const visible = section.text.slice(0, visibleCount);
  const caretIsHere =
    showCaret &&
    revealedCharacters >= section.start &&
    revealedCharacters < section.start + section.text.length;

  if (!visible && !caretIsHere) return null;

  return (
    <>
      <span>{visible}</span>
      {caretIsHere ? <i className="text-caret" /> : null}
    </>
  );
}
