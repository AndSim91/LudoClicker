/*
 * Errori del livello 0 ("Bozza disastrata"), generati a partire dal testo corretto.
 *
 * Per aggiungere un errore basta una riga in TYPOS: parola corretta (minuscola)
 * → una o più storpiature. Le parole lunghe fuori dall'elenco possono ricevere
 * due lettere invertite. La scelta è deterministica (stessa email, stessi errori)
 * e le posizioni vengono restituite, così la sottolineatura non ha bisogno di
 * un secondo elenco.
 */

export type TypoRange = [start: number, end: number];

export interface TypoText {
  text: string;
  ranges: TypoRange[];
}

const TYPOS: Record<string, string[]> = {
  // Accenti e apostrofi
  "è": ["e", "é"],
  "e": ["è"],
  "perché": ["perche", "xké", "perchè"],
  "più": ["piu", "pù"],
  "già": ["gia"],
  "però": ["pero"],
  "cioè": ["cioe"],
  "finché": ["finche"],
  "sì": ["si"],
  "lì": ["li"],
  "curiosità": ["curiosita"],
  "qualità": ["qualita"],
  "attività": ["attivita"],
  "lunedì": ["lunedi"],
  "mercoledì": ["mercoledi"],
  "c'è": ["ce", "cè"],
  "c'era": ["cera"],
  "un po'": ["un pò", "un po"],
  "qual è": ["qual'è"],
  "a volte": ["avvolte"],
  "a parte": ["apparte"],
  "d'accordo": ["daccordo"],
  "un'altra": ["un altra"],
  "all'evento": ["al evento"],
  "dell'acqua": ["del acqua"],
  // H mancanti o di troppo
  "ha": ["a"],
  "hai": ["ai"],
  "ho": ["o"],
  "hanno": ["anno"],
  "a": ["ha"],
  "o": ["ho"],
  // Stile SMS
  "che": ["ke", "k"],
  "anche": ["anke", "ance"],
  "non": ["nn"],
  "comunque": ["cmq", "cmunque"],
  "per": ["x"],
  "quando": ["qnd", "cuando"],
  "qualcosa": ["qlcs", "qualkosa"],
  "questa": ["qsta", "qesta"],
  "questo": ["qsto", "qesto"],
  "quasi": ["cuasi"],
  "qualcuno": ["qualkuno"],
  "niente": ["nnt"],
  "messaggio": ["msg"],
  // Doppie sbagliate
  "abbiamo": ["abiamo"],
  "gruppo": ["grupo", "grupoo"],
  "palestra": ["palestrra", "palesta"],
  "spada": ["spadda"],
  "spade": ["spadde"],
  "prova": ["proova", "prva"],
  "provare": ["provore", "provvare"],
  "gratis": ["gratiss", "grtis"],
  "gratuita": ["gratuitta", "grauita"],
  "sport": ["sporrt"],
  "ludosport": ["Udosport", "Ludosprot", "ludo sport"],
  "vieni": ["vienni", "veni"],
  "venire": ["vennire"],
  "prima": ["primma"],
  "esercizi": ["esercizzi"],
  "persone": ["perssone"],
  "persona": ["perssona"],
  "sicurezza": ["sicureza"],
  "lezione": ["lezzione", "lesione"],
  "ancora": ["ancorra"],
  "alleniamo": ["aleniamo"],
  "allenamento": ["allenamneto", "alenamento"],
  "alleni": ["aleni"],
  "coordinazione": ["cordinazione"],
  "accogliente": ["acogliente"],
  "pratica": ["prattica"],
  "attrezzatura": ["attrezatura"],
  "subito": ["subbito"],
  "comodi": ["commodi"],
  "pulite": ["pullite"],
  "movimento": ["movimmento"],
  "importante": ["inportante"],
  "tutto": ["tuto"],
  "tutti": ["tuti"],
  "adesso": ["adeso"],
  "troppo": ["tropo"],
  "solo": ["sollo"],
  "sempre": ["senpre"],
  "esperienza": ["esperiensa"],
  "senza": ["sensa"],
  "impari": ["inpari"],
  "impara": ["inpara"],
  "impugni": ["inpugni"],
  "iniziare": ["inizziare"],
  "divertente": ["divertende"],
  "principianti": ["principanti"],
  "precisione": ["precisone"],
  "settimana": ["setimana"],
  "minuti": ["minnuti"],
  "vestiti": ["vestitti"],
  "scarpe": ["scarppe"],
  "mentre": ["menntre"],
  "genova": ["Genuva", "Genoa"],
  "facile": ["faccile"],
  "meglio": ["meglo"],
  "gambe": ["ganbe"],
  "insieme": ["inseme"],
  "davvero": ["daverro"],
};

// About one word in 3.5 gets an error.
const TYPO_RATE = 0.28;
const SCRAMBLE_MIN_LENGTH = 5;

const TYPO_KEYS = Object.keys(TYPOS).sort((left, right) => right.length - left.length);
const TOKEN = new RegExp(
  `(?<!\\p{L})(?:${TYPO_KEYS.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}|\\p{L}{${SCRAMBLE_MIN_LENGTH},})(?![\\p{L}])`,
  "giu",
);

function hash(value: string): number {
  let result = 0x811c9dc5;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

function matchCase(original: string, typo: string): string {
  if (original.length > 1 && original === original.toLocaleUpperCase("it-IT")) {
    return typo.toLocaleUpperCase("it-IT");
  }
  const first = original[0];
  if (first !== first.toLocaleLowerCase("it-IT") && typo[0] === typo[0].toLocaleLowerCase("it-IT")) {
    return `${typo[0].toLocaleUpperCase("it-IT")}${typo.slice(1)}`;
  }
  return typo;
}

// Two inner letters swapped: "allenamento" → "allenamneto".
function scramble(word: string, seed: number): string {
  const position = 2 + (seed % Math.max(1, word.length - 4));
  return `${word.slice(0, position)}${word[position + 1]}${word[position]}${word.slice(position + 2)}`;
}

interface Candidate {
  start: number;
  end: number;
  typo: string;
  known: boolean;
  order: number;
}

/**
 * Adds gross spelling errors to correct text: about one word in four, at least
 * `minimum`. Known mistakes (TYPOS) are preferred to scrambled letters.
 */
export function addLevelZeroTypos(
  text: string,
  seed: string,
  { protectedWords = [], minimum = 3 }: { protectedWords?: string[]; minimum?: number } = {},
): TypoText {
  const protectedSet = new Set(protectedWords.map((word) => word.toLocaleLowerCase("it-IT")));
  const words = text.match(/\p{L}+/gu)?.length ?? 0;
  const candidates: Candidate[] = [];
  for (const match of text.matchAll(TOKEN)) {
    const original = match[0];
    const key = original.toLocaleLowerCase("it-IT");
    if (protectedSet.has(key)) continue;
    const order = hash(`${seed}:${match.index}`);
    const variants = TYPOS[key];
    const typo = variants
      ? matchCase(original, variants[order % variants.length])
      : scramble(original, order);
    if (typo === original) continue;
    candidates.push({ start: match.index, end: match.index + original.length, typo, known: Boolean(variants), order });
  }

  const wanted = Math.min(candidates.length, Math.max(minimum, Math.round(words * TYPO_RATE)));
  const chosen = candidates
    .slice()
    .sort((left, right) => Number(right.known) - Number(left.known) || left.order - right.order)
    .slice(0, wanted)
    .sort((left, right) => left.start - right.start);

  let output = "";
  let cursor = 0;
  const ranges: TypoRange[] = [];
  for (const candidate of chosen) {
    output += text.slice(cursor, candidate.start);
    ranges.push([output.length, output.length + candidate.typo.length]);
    output += candidate.typo;
    cursor = candidate.end;
  }
  output += text.slice(cursor);
  return { text: output, ranges };
}
