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
 * è quasi impossibile. I punti sono relativi al livello del campo del torneo.
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

const STYLE_ACTION_MAX_FROM_STYLE = 0.15;
const STYLE_ACTION_FULL_STYLE = 500;
const STYLE_ACTION_PER_ADVANTAGE = 0.4;
const STYLE_ACTION_MAX_FROM_ADVANTAGE = 0.2;
const STYLE_ACTION_CAP = 0.35;

/**
 * Probabilità di una COM o di una SAPD nell'incontro (decisione del 06/10):
 * fino al 15% secondo lo Stile (pieno a 500), più 0,4 punti per ogni punto
 * percentuale di Stile in più dell'avversario, fino a +20%. Tetto 35%.
 */
export function getStyleActionChance(style: number, opponentStyle: number): number {
  const fromStyle = STYLE_ACTION_MAX_FROM_STYLE * Math.min(1, Math.max(0, style) / STYLE_ACTION_FULL_STYLE);
  const advantage = opponentStyle > 0 ? Math.max(0, style / opponentStyle - 1) : 0;
  const fromAdvantage = Math.min(STYLE_ACTION_MAX_FROM_ADVANTAGE, STYLE_ACTION_PER_ADVANTAGE * advantage);
  return Math.min(STYLE_ACTION_CAP, fromStyle + fromAdvantage);
}

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
  /** Probabilità di vincere un assalto: misura quanto l'incontro è alla pari. */
  assaultChance: number;
  scored: number;
  roll: () => number;
}

/** COM e SAPD con la spada in mano. */
export function rollStyleActions(input: StyleActionInput): StyleActions {
  const { roll, scored, assaultChance, forms } = input;
  const chance = getStyleActionChance(input.style, input.opponentStyle);
  const actions: StyleActions = { com: 0, sapd: 0 };

  // COM: solo se integrate nel combattimento (no «farming»).
  const open = assaultChance <= 0.85 && scored > 0;
  const complexForms = getComplexTechniqueForms(forms, input.weapon);
  if (open && complexForms.length > 0 && roll() < chance) {
    const form = pick(roll, complexForms);
    actions.technique = pick(roll, COMPLEX_TECHNIQUES[form]!);
    if (isComAndSapd(actions.technique)) {
      actions.com = 1;
      actions.sapd = 1;
    } else {
      const advanced = form !== "form-1" && form !== "form-2";
      actions.com = (advanced ? 1 : 0.5) + (roll() < 0.5 ? 0.5 : 0);
    }
  }

  // SAPD: Sync, Armoniche, Prese, Disarmi; uguali per ogni arma.
  const sapdOptions = [
    "Disarmo",
    ...(forms.includes("form-3-long") ? ["Sync", "Armonica"] : []),
    ...(forms.includes("form-2") ? ["Presa"] : []),
  ];
  if (scored > 0 && roll() < chance) {
    actions.highlight = pick(roll, sapdOptions);
    actions.sapd = Math.max(actions.sapd, 1);
    if (isComAndSapd(actions.highlight)) actions.com = Math.max(actions.com, 1);
  }
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
  if (input.roll() >= getStyleActionChance(input.style, input.opponentStyle)) return actions;
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
  /** Preparazione Stile del giorno (con la forma) divisa per la media del campo. */
  relativeStyle: number;
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
  penalty?: StylePenaltyReason;
}

const toHalf = (value: number) => Math.min(3, Math.max(0, Math.round(value * 2) / 2));

function pick<T>(roll: () => number, values: readonly T[]): T {
  return values[Math.min(values.length - 1, Math.floor(roll() * values.length))];
}

// Taratura: un atleta nella media del campo prende circa 1,25 su BAS, MOV,
// DIN e GCC (voto ~6,5); chi vince lo Stile viaggia sui 2–2,5 (voto ~7,5).
// Un 3 è raro: solo chi domina il campo e ha una buona giornata.
const LEVEL_AT_AVERAGE = 1.25;
const LEVEL_PER_LOG = 2;
const TOP_KNEE = 2.25;
const TOP_SLOPE = 0.7;
/** Il livello non supera mai 2,6: anche chi stravince il campo prende un 3 solo con una bella giornata. */
const TOP_SPAN = 0.35;

export function judgeStyle(input: StyleJudgementInput): StyleJudgement {
  const { roll, scored, conceded, assaultChance } = input;
  const experienceShare = Math.min(20, Math.max(0, input.experience)) / 20;
  const raw = LEVEL_AT_AVERAGE + LEVEL_PER_LOG * Math.log(Math.max(0.05, input.relativeStyle));
  // Sopra 2,25 si sale più piano (pendenza 0,7) verso 2,6: il 3 resta la perfezione.
  const level = raw <= TOP_KNEE
    ? raw
    : TOP_KNEE + TOP_SPAN * (1 - Math.exp((-(raw - TOP_KNEE) * TOP_SLOPE) / TOP_SPAN));

  // Fatti dell'incontro, uguali per tutti i giudici.
  // MOV: iniziativa sull'Orizzonte degli Eventi oltre quanto atteso.
  const initiative = 1.5 * (scored / (scored + conceded) - assaultChance);
  // DIN: giornata; chi ha esperienza di torneo oscilla meno.
  const rhythm = (roll() - 0.5) * 0.6 * (1 - experienceShare / 2);

  const { com, sapd, technique, highlight } = input.actions;

  // DIF: sovrastato in Arena e sconfitto, ma capace di andare comunque a segno
  // («still trying hard and well to score»).
  const dif = assaultChance < 0.15 && conceded > scored && scored > 0 ? 1 : 0;

  // Cartellino di Stile: può sempre capitare, più spesso a chi è inesperto,
  // in cattiva forma o sta perdendo male. Vale −0,5 per questo incontro.
  const badForm = Math.min(1, Math.max(0, (1 - input.condition) / 0.3));
  const routed = scored === 0 ? 1 : 0;
  let penalty: StylePenaltyReason | undefined;
  if (roll() < 0.01 + 0.03 * (1 - experienceShare) + 0.02 * badForm + 0.015 * routed) {
    const reason = roll();
    penalty = reason < 0.5 ? "declaration" : reason < 0.8 ? "cura" : "rispetto";
  }

  // Incontro deciso all'ultimo assalto (2–1, o 3–2 in finale).
  const close = Math.abs(scored - conceded) === 1 ? 0.5 : 0;
  const sheets = Array.from({ length: input.judges }, (): StyleSheet => {
    // Occhio del giudice largo esattamente mezzo punto: l'arrotondamento al
    // mezzo punto resta giusto in media e non crea pareggi a gradini.
    const eye = () => (roll() - 0.5) * 0.5;
    const sog = Math.min(3, Math.max(0, Math.floor(roll() * 2.2 + close + 0.3 * (level - LEVEL_AT_AVERAGE))));
    return [
      toHalf(level + eye()),
      toHalf(level + initiative + eye()),
      toHalf(level + rhythm + eye()),
      com,
      sapd,
      toHalf(level + eye()),
      dif,
      sog,
      penalty ? 1 : 0,
    ];
  });
  const vote = sheets.reduce((total, sheet) => total + scoreStyleSheet(sheet), 0) / sheets.length;

  return {
    vote,
    penalty,
    detail: {
      sheets,
      ...(technique ? { technique } : {}),
      ...(highlight ? { highlight } : {}),
    },
  };
}
