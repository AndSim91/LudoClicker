import { getStyleVote } from "./athleteStats";
import type { FormId, TournamentLevel, TournamentStyleCard, TournamentStyleDetail } from "./types";

/**
 * Voto di Stile «alla Servizio», dalle Guidelines for Style Judges INCOM 2.6.5:
 * un giudizio sull'intero incontro composto da coefficienti tecnici
 * (BAS+GCC, MOV, DIN, COM, SAPD, DIF), uno di merito (SOG) e le penalità.
 * La preparazione resta l'ossatura (curva di sempre); il resto dipende
 * dall'incontro e in media sposta poco.
 */

// Tecniche complesse (COM) elencate dal documento per ciascuna Forma.
export const COMPLEX_TECHNIQUES: Partial<Record<FormId, readonly string[]>> = {
  "form-1": ["Settima", "Ottava", "Prima Armonica", "Seconda Armonica", "Terza Armonica", "Quarta Armonica"],
  "form-2": ["Seconda di Quarta", "Biru Biru", "Sesta a Due Mani"],
  "form-3-long": ["Cruna dell'Ago", "Armonica", "Circolare", "Sync di Spalle", "Sync Fronte Taglio", "Sync in Blocco"],
  "form-4-long": ["Ceduta Impropria", "Gancio in Reverso Filo", "Mano Fantasma"],
  "form-5-long": [
    "Ricerca del Pommel sui Laterali",
    "Ricerca del Pommel su Parate Alte",
    "Spirale Ascendente Difensiva",
    "Spirale Ascendente Offensiva",
  ],
  "form-3-double": ["Circolare", "Cruna dell'Ago", "Leva", "Rampa"],
  "form-4-double": ["Ceduta Impropria", "Rotolata"],
  "form-5-double": ["Ricerca del Pommel", "Seconda Circolare", "Terza Spirale"],
  "form-3-staff": ["Circolare", "Reazione al Fendente"],
  "form-4-staff": ["Battuta con Rotazione Ascendente", "Schivata in Copertura", "Circolare Semplice"],
  "form-5-staff": ["Spirale in Circolare", "Circolare in Armonica"],
};

const STYLE_JUDGES: Record<TournamentLevel, number> = {
  school: 1,
  academy: 1,
  national: 2,
  champions: 3,
  chronicles: 3,
};

export function getStyleJudgeCount(level: TournamentLevel): number {
  return STYLE_JUDGES[level];
}

const WEAPONS = ["long", "double", "staff"] as const;

/** Gli atleti esterni hanno solo il numero di Forme: l'arma è stabile per persona. */
export function getNpcStyleForms(id: string, numericForms: number): FormId[] {
  let hash = 0;
  for (const character of id) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  const weapon = WEAPONS[(hash >>> 0) % WEAPONS.length];
  const forms: FormId[] = ["form-1"];
  if (numericForms >= 2) forms.push("form-2");
  for (let form = 3; form <= Math.min(5, numericForms); form += 1) {
    forms.push(`form-${form}-${weapon}` as FormId);
  }
  return forms;
}

export interface StyleJudgementInput {
  performance: number;
  forms: readonly FormId[];
  experience: number;
  condition: number;
  /** Probabilità di vincere un assalto: misura quanto l'incontro è alla pari. */
  assaultChance: number;
  scored: number;
  conceded: number;
  judges: number;
  roll: () => number;
}

export interface StyleJudgement {
  vote: number;
  detail: TournamentStyleDetail;
  card?: TournamentStyleCard;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
/**
 * I coefficienti sono in «punti di voto a metà scala» e si sommano alla
 * prestazione prima della curva: a metà scala un punto vale un punto di voto,
 * vicino al 10 vale meno ma ordina gli atleti allo stesso modo (niente tetto).
 */
const PERFORMANCE_PER_POINT = 20;

function pick<T>(roll: () => number, values: readonly T[]): T {
  return values[Math.min(values.length - 1, Math.floor(roll() * values.length))];
}

export function judgeStyle(input: StyleJudgementInput): StyleJudgement {
  const { roll, scored, conceded, assaultChance } = input;
  const experienceShare = Math.min(20, Math.max(0, input.experience)) / 20;

  // BAS + GCC: tecniche di base e giudizio complessivo, cioè la preparazione.
  const bas = getStyleVote(input.performance);
  // MOV: tenere l'iniziativa sull'Orizzonte degli Eventi oltre quanto atteso.
  const mov = 1.2 * (scored / (scored + conceded) - assaultChance);
  // DIN: concatenare le tecniche; chi ha esperienza è più costante.
  const din = (roll() - 0.5) * 0.8 * (1 - experienceShare / 2);

  // COM: solo tecniche integrate nel combattimento (no «farming»): niente
  // spettacolo contro chi è fuori portata, niente se non si è mai andati a segno.
  let com = 0;
  let technique: string | undefined;
  const complexForms = input.forms.filter((form) => COMPLEX_TECHNIQUES[form]);
  if (complexForms.length > 0 && roll() < Math.min(0.6, 0.12 * complexForms.length)) {
    const form = pick(roll, complexForms);
    const name = pick(roll, COMPLEX_TECHNIQUES[form]!);
    if (assaultChance <= 0.9 && scored > 0) {
      technique = name;
      com = form === "form-1" || form === "form-2" ? 0.25 : 0.45;
    }
  }

  // SAPD: Sync, Armoniche, Prese, Disarmi.
  let sapd = 0;
  let highlight: string | undefined;
  const sapdOptions = [
    "Disarmo",
    ...(input.forms.includes("form-3-long") ? ["Sync"] : []),
    ...(input.forms.includes("form-1") || input.forms.includes("form-3-long") ? ["Armonica"] : []),
    ...(input.forms.includes("form-2") ? ["Presa"] : []),
  ];
  if (roll() < 0.04 + 0.03 * (sapdOptions.length - 1)) {
    highlight = pick(roll, sapdOptions);
    sapd = highlight === "Disarmo" ? 0.6 : 0.5;
  }

  // DIF: sovrastato in Arena ma ancora in partita.
  const dif = assaultChance < 0.15 && conceded > scored ? 0.25 + (scored > 0 ? 0.25 : 0) : 0;

  // Penalità: il cartellino è condiviso da tutti i giudici.
  let penalty = 0;
  let card: TournamentStyleCard | undefined;
  const badForm = Math.min(1, Math.max(0, (1 - input.condition) / 0.3));
  if (roll() < 0.01 + 0.03 * (1 - experienceShare) + 0.02 * badForm) {
    const black = roll() < 0.1;
    const reasonRoll = roll();
    card = {
      color: black ? "black" : "yellow",
      reason: reasonRoll < 0.5 ? "declaration" : reasonRoll < 0.8 ? "cura" : "rispetto",
    };
    penalty = black ? -2 : -1;
  }

  // SOG e occhio di ciascun giudice; gli incontri tirati piacciono di più.
  const close = scored + conceded === 3 ? 0.1 : 0;
  const shared = mov + din + com + sapd + dif + penalty;
  const sogs = Array.from({ length: input.judges }, () => (roll() - 0.5) * 0.8 + close);
  const judges = sogs.map((sog) =>
    getStyleVote(input.performance + PERFORMANCE_PER_POINT * (shared + sog)));
  const vote = judges.reduce((total, value) => total + value, 0) / judges.length;

  return {
    vote,
    card,
    detail: {
      bas: round2(bas),
      mov: round2(mov),
      din: round2(din),
      com: round2(com),
      sapd: round2(sapd),
      dif: round2(dif),
      sog: round2(sogs.reduce((total, value) => total + value, 0) / sogs.length),
      penalty,
      judges: judges.map(round2),
      ...(technique ? { technique } : {}),
      ...(highlight ? { highlight } : {}),
    },
  };
}
