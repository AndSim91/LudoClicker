import type { PersonRarity } from "../game/types";

/**
 * Keywords in the game's prose (06/10/2026, concept A «Etichetta della barra»):
 *   [[Eventi]]        page of the left bar → label with the bar's icon
 *   **Contatti**      a number of the game (Contatti, Iscritti, Fondi, Spade, Fama, Reputazione) → bold
 *   [[a:Eventi]]      Area di Attività of a collaborator → dashed label
 *   [[r:Leggendari]]  rarity → the rarity's colour
 * Marked by hand, only at the first mention in a paragraph and only when the word is the game thing.
 */
export type KeywordSegment =
  | { kind: "text" | "page" | "number" | "area"; text: string }
  | { kind: "rarity"; text: string; rarity: PersonRarity };

const MARKUP = /\[\[(?:([ar]):)?([^\]]+)\]\]|\*\*([^*]+)\*\*/g;

export function getRarityFromWord(word: string): PersonRarity | undefined {
  const lower = word.toLowerCase();
  if (lower.startsWith("ultra")) return "ultra-rare";
  if (lower.startsWith("leggendar")) return "legendary";
  if (lower.startsWith("comun")) return "common";
  if (lower.startsWith("rar")) return "rare";
  return undefined;
}

export function parseKeywordMarkup(text: string): KeywordSegment[] {
  const segments: KeywordSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(MARKUP)) {
    if (match.index > last) segments.push({ kind: "text", text: text.slice(last, match.index) });
    const [, prefix, bracketed, bold] = match;
    if (bold !== undefined) segments.push({ kind: "number", text: bold });
    else if (prefix === "a") segments.push({ kind: "area", text: bracketed });
    else if (prefix === "r") {
      const rarity = getRarityFromWord(bracketed);
      segments.push(rarity ? { kind: "rarity", text: bracketed, rarity } : { kind: "text", text: bracketed });
    } else segments.push({ kind: "page", text: bracketed });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}

/** The same text without markup: for aria labels, titles, search and anything that is not drawn. */
export function stripKeywordMarkup(text: string): string {
  return text.replace(MARKUP, (_, _prefix, bracketed, bold) => bold ?? bracketed);
}
