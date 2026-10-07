import type {
  FormBranch,
  FormId,
  StylePenaltyReason,
  StyleSheet,
  TournamentLevel,
  TournamentMatch,
  TournamentStyleDetail,
} from "./types";

/**
 * Voto di Stile come lo dà un giudice con l'app Servizio (INCOM):
 * voto = 5,5 + 0,2 × punti tecnici + 0,1 × SOG − 0,5 × PEN.
 * Coefficienti dalle Guidelines for Style Judges 2.6.5. Come nella realtà, un
 * incontro normale sta tra 5,5 e 8,5, 3 su una voce è la perfezione e il 10
 * è quasi impossibile. Il voto è assoluto (modello C, 07/10): vedi sotto.
 */

// Tecniche complesse (COM) elencate dal documento per ciascuna Forma. Si fanno
// solo con l'arma della Forma: F1 e F2 con la spada lunga (decisione del 06/10).
export const COMPLEX_TECHNIQUES: Partial<Record<FormId, readonly string[]>> = {
  "form-1": ["Settima", "Ottava"],
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

/** Le Armoniche della Forma 1 si fanno senza spada: solo chi è stato disarmato. */
export const DISARMED_ARMONICHE = [
  "Prima Armonica",
  "Seconda Armonica",
  "Terza Armonica",
  "Quarta Armonica",
] as const;

const FORM_WEAPON: Partial<Record<FormId, FormBranch>> = {
  "form-1": "Spada Lunga",
  "form-2": "Spada Lunga",
  "form-3-long": "Spada Lunga",
  "form-4-long": "Spada Lunga",
  "form-5-long": "Spada Lunga",
  "form-3-staff": "Staffa",
  "form-4-staff": "Staffa",
  "form-5-staff": "Staffa",
  "form-3-double": "Doppia spada corta",
  "form-4-double": "Doppia spada corta",
  "form-5-double": "Doppia spada corta",
};

/** COM possibili: le tecniche delle Forme conosciute con l'arma usata nell'incontro. */
export function getComplexTechniqueForms(forms: readonly FormId[], weapon: FormBranch): FormId[] {
  return forms.filter((formId) => COMPLEX_TECHNIQUES[formId] && FORM_WEAPON[formId] === weapon);
}

/** Armoniche e Sync sono così rare che valgono 1 punto sia in COM sia in SAPD. */
export function isComAndSapd(name: string): boolean {
  return name.includes("Armonica") || name.startsWith("Sync");
}

/**
 * Modello C del voto di Stile (decisione del 07/10, docs/tournament-system-design.md § 5).
 * Il voto è assoluto: dipende dallo Stile dell'atleta, non dalla media del campo.
 * Lo Stile è la qualità (BAS, MOV, DIN, GCC e sanzioni), le Forme sono il
 * repertorio (COM), la differenza con l'avversario rende più facili le SAPD.
 */
const QUALITY_REFERENCE = 250;
const QUALITY_SLOPE = 1.4;

/** Qualità del giudice 0–3: ~0,5 a 75 di Stile, ~1,2 a 200, ~2,5 a 1.000. */
export function getStyleQuality(style: number): number {
  if (!(style > 0)) return 0;
  return 3 / (1 + (QUALITY_REFERENCE / style) ** QUALITY_SLOPE);
}

/** Forme conosciute che contano per lo spazio per esprimersi (Corso X escluso). */
export function countStyleForms(forms: readonly FormId[]): number {
  return forms.filter((formId) => formId !== "course-x").length;
}

/**
 * Spazio per esprimersi (0–1). Pieno se l'avversario ha tra ~0,75 e 3 volte il
 * nostro potenziale; cala se ci sovrasta o se è così debole da restare fermo.
 * Il potenziale è lo Stile più un 10% per ogni Forma di differenza.
 */
export function getExpressionSpace(
  style: number,
  opponentStyle: number,
  forms: number,
  opponentForms: number,
): number {
  const gap = Math.log(Math.max(1e-3, style) / Math.max(1e-3, opponentStyle)) + 0.1 * (forms - opponentForms);
  const overwhelmed = Math.max(0, -gap - 0.3);
  const stillOpponent = Math.max(0, gap - 1.1);
  return Math.exp(-(overwhelmed ** 2) / 0.4) * Math.exp(-(stillOpponent ** 2) / 0.6);
}

const COM_CHANCE = 0.9;
const SAPD_CHANCE = 0.5;
const ACTION_POWER = 3.5;
/** Con 3 Forme che hanno COM per l'arma in mano il repertorio è pieno. */
const FULL_REPERTOIRE = 3;
const ACTION_CAP = 3;

export interface StyleActions {
  com: number;
  sapd: number;
  technique?: string;
  highlight?: string;
}

export interface StyleActionInput {
  forms: readonly FormId[];
  weapon: FormBranch;
  style: number;
  opponentStyle: number;
  /** Spazio per esprimersi (getExpressionSpace). */
  space: number;
  /** Assalti vinti: COM e SAPD si portano solo in un assalto vinto. */
  scored: number;
  roll: () => number;
}

function actionStrength(style: number, space: number): number {
  return (getStyleQuality(style) / 3) ** ACTION_POWER * space;
}

/** Facilità delle SAPD: 0,5–2 secondo il rapporto di Stile con l'avversario. */
function sapdEase(style: number, opponentStyle: number): number {
  const ratio = Math.max(1e-3, style) / Math.max(1e-3, opponentStyle);
  return Math.min(2, Math.max(0.5, 1 + 0.6 * Math.log(ratio)));
}

/** Probabilità di una SAPD in un assalto vinto (anche l'Armonica del disarmato). */
export function getSapdChance(style: number, opponentStyle: number, space: number): number {
  return SAPD_CHANCE * actionStrength(style, space) * sapdEase(style, opponentStyle);
}

/** COM e SAPD con la spada in mano, assalto vinto per assalto vinto. */
export function rollStyleActions(input: StyleActionInput): StyleActions {
  const { roll, forms } = input;
  const actions: StyleActions = { com: 0, sapd: 0 };
  const complexForms = getComplexTechniqueForms(forms, input.weapon);
  const comChance = COM_CHANCE * actionStrength(input.style, input.space) *
    Math.min(1, complexForms.length / FULL_REPERTOIRE);
  const sapdChance = getSapdChance(input.style, input.opponentStyle, input.space);
  // SAPD: Sync, Armoniche, Prese, Disarmi; uguali per ogni arma.
  const sapdOptions = [
    "Disarmo",
    ...(forms.includes("form-3-long") ? ["Sync", "Armonica"] : []),
    ...(forms.includes("form-2") ? ["Presa"] : []),
  ];
  for (let assault = 0; assault < input.scored; assault += 1) {
    if (complexForms.length > 0 && roll() < comChance) {
      const form = pick(roll, complexForms);
      const technique = pick(roll, COMPLEX_TECHNIQUES[form]!);
      actions.technique ??= technique;
      if (isComAndSapd(technique)) {
        actions.com += 1;
        actions.sapd += 1;
      } else {
        const advanced = form !== "form-1" && form !== "form-2";
        actions.com += (advanced ? 1 : 0.5) + (roll() < 0.5 ? 0.5 : 0);
      }
    }
    if (roll() < sapdChance) {
      const highlight = pick(roll, sapdOptions);
      actions.highlight ??= highlight;
      actions.sapd += 1;
      if (isComAndSapd(highlight)) actions.com += 1;
    }
  }
  actions.com = Math.min(ACTION_CAP, actions.com);
  actions.sapd = Math.min(ACTION_CAP, actions.sapd);
  return actions;
}

/**
 * Chi è stato disarmato può fare solo un'Armonica della Forma 1, senza spada:
 * vale 1 in COM e 1 in SAPD.
 */
export function rollDisarmedArmonica(
  actions: StyleActions,
  input: StyleActionInput,
): StyleActions {
  if (!input.forms.includes("form-1") || input.scored <= 0) return actions;
  if (input.roll() >= getSapdChance(input.style, input.opponentStyle, input.space)) return actions;
  const name = pick(input.roll, DISARMED_ARMONICHE);
  return {
    com: Math.max(actions.com, 1),
    sapd: Math.max(actions.sapd, 1),
    technique: actions.technique ?? name,
    highlight: actions.highlight ?? name,
  };
}

const FINAL_PHASES: readonly TournamentMatch["stage"][] = ["semifinal", "bronze", "final"];
const BIG_STAGES: readonly TournamentLevel[] = ["national", "champions", "chronicles"];

/** Un giudice nei gironi e nel tabellone; nelle fasi finali 2, o 4 nei tornei maggiori. */
export function getStyleJudgeCount(level: TournamentLevel, stage: TournamentMatch["stage"]): number {
  if (!FINAL_PHASES.includes(stage)) return 1;
  return BIG_STAGES.includes(level) ? 4 : 2;
}

const WEAPONS = ["long", "double", "staff"] as const;

/**
 * Gli atleti esterni hanno solo il numero di Forme: l'arma è stabile per persona
 * e le Forme sono quelle del percorso più breve (Corso X escluso).
 */
export function getNpcStyleForms(id: string, numericForms: number): FormId[] {
  let hash = 0;
  for (const character of id) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  const weapon = WEAPONS[(hash >>> 0) % WEAPONS.length];
  const forms: FormId[] = ["form-1"];
  if (numericForms >= 2) forms.push("form-2");
  if (numericForms >= 3) forms.push("course-y");
  for (let form = 3; form <= Math.min(5, numericForms); form += 1) {
    forms.push(`form-${form}-${weapon}` as FormId);
  }
  if (numericForms >= 6) forms.push("form-6");
  if (numericForms >= 7) forms.push("form-7");
  return forms;
}

export function scoreStyleSheet([bas, mov, din, com, sapd, gcc, dif, sog, pen]: StyleSheet): number {
  // In decimi, come Servizio, per evitare errori di arrotondamento.
  const halfPoints = (bas + mov + din + com + sapd + gcc + dif) * 2;
  return Math.max(0, 55 + halfPoints + sog - 5 * pen) / 10;
}

export interface StyleJudgementInput {
  /** Preparazione Stile del giorno (con la forma). */
  style: number;
  opponentStyle: number;
  /** Spazio per esprimersi (getExpressionSpace). */
  space: number;
  /** COM e SAPD dell'incontro (rollStyleActions): uguali per tutti i giudici. */
  actions: StyleActions;
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
  /** Il cartellino di Stile: uno solo, a fine incontro, con una o più sanzioni. */
  penalty?: StylePenaltyReason;
  penalties: number;
}

const toHalf = (value: number) => Math.min(3, Math.max(0, Math.round(value * 2) / 2));

function pick<T>(roll: () => number, values: readonly T[]): T {
  return values[Math.min(values.length - 1, Math.floor(roll() * values.length))];
}

/** Qualità a cui il SOG non cambia: sopra sale, sotto scende. */
const SOG_PIVOT = 1.25;

/** Prima sanzione in un assalto: 30% a 0 di Stile, ~15% a 20, ~4% a 45, ~1% a 75. */
const SANCTION_CHANCE = 0.3;
const SANCTION_HALF_STYLE = 20;
const SANCTION_POWER = 2.5;
const NEXT_SANCTION = 0.4;
const SANCTIONS_PER_ASSAULT = 3;
/** Con 11 sanzioni il voto è 0: oltre non ha senso. */
export const MAX_STYLE_SANCTIONS = 11;

/**
 * Sanzioni dell'incontro: a ogni assalto 1, 2 o 3, sempre più improbabili.
 * Contano poco Stile, un avversario che mette pressione, poca esperienza e
 * una brutta giornata. Il giudice le scrive tutte su un solo cartellino.
 */
function rollSanctions(input: StyleJudgementInput): number {
  const experienceShare = Math.min(20, Math.max(0, input.experience)) / 20;
  const badForm = Math.min(1, Math.max(0, (1 - input.condition) / 0.3));
  const pressure = Math.min(1.6, Math.max(0.7, (input.opponentStyle / Math.max(1, input.style)) ** 0.3));
  const style = Math.max(0, input.style);
  const first = SANCTION_CHANCE / (1 + (style / SANCTION_HALF_STYLE) ** SANCTION_POWER) * pressure *
    (1.3 - 0.6 * experienceShare) * (1 + 0.5 * badForm);
  let total = 0;
  for (let assault = 0; assault < input.scored + input.conceded; assault += 1) {
    let chance = first;
    for (let count = 0; count < SANCTIONS_PER_ASSAULT && input.roll() < chance; count += 1) {
      total += 1;
      chance *= NEXT_SANCTION;
    }
  }
  return Math.min(MAX_STYLE_SANCTIONS, total);
}

export function judgeStyle(input: StyleJudgementInput): StyleJudgement {
  const { roll, scored, conceded, assaultChance } = input;
  const experienceShare = Math.min(20, Math.max(0, input.experience)) / 20;
  const quality = getStyleQuality(input.style);

  // Fatti dell'incontro, uguali per tutti i giudici.
  // MOV: iniziativa sull'Orizzonte degli Eventi oltre quanto atteso.
  const assaults = Math.max(1, scored + conceded);
  const initiative = 1.5 * (scored / assaults - assaultChance);
  // DIN: giornata; chi ha esperienza di torneo oscilla meno.
  const rhythm = (roll() - 0.5) * 0.6 * (1 - experienceShare / 2);
  const { com, sapd, technique, highlight } = input.actions;
  // DIF: «non ha potuto esprimersi» quanto avrebbe potuto, sovrastato o
  // davanti a chi resta fermo. Pesa di più per chi ha più qualità.
  const unexpressed = 3 * (quality / 3) ** 1.5 * (1 - input.space);

  const penalties = rollSanctions(input);
  let penalty: StylePenaltyReason | undefined;
  if (penalties > 0) {
    const reason = roll();
    penalty = reason < 0.5 ? "declaration" : reason < 0.8 ? "cura" : "rispetto";
  }

  // Incontro deciso all'ultimo assalto (2–1, o 3–2 in finale).
  const close = Math.abs(scored - conceded) === 1 ? 0.5 : 0;
  const sheets = Array.from({ length: input.judges }, (): StyleSheet => {
    // Occhio del giudice largo esattamente mezzo punto: l'arrotondamento al
    // mezzo punto resta giusto in media e non crea pareggi a gradini.
    const eye = () => (roll() - 0.5) * 0.5;
    const sog = Math.min(3, Math.max(0, Math.floor(roll() * 2.2 + close + 0.3 * (quality - SOG_PIVOT))));
    return [
      toHalf(quality + eye()),
      toHalf(quality + initiative + eye()),
      toHalf(quality + rhythm + eye()),
      com,
      sapd,
      toHalf(quality + eye()),
      unexpressed > 0.05 ? toHalf(unexpressed + eye()) : 0,
      sog,
      penalties,
    ];
  });
  const vote = sheets.reduce((total, sheet) => total + scoreStyleSheet(sheet), 0) / sheets.length;

  return {
    vote,
    penalty,
    penalties,
    detail: {
      sheets,
      ...(technique ? { technique } : {}),
      ...(highlight ? { highlight } : {}),
    },
  };
}
