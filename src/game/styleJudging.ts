import type {
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

const FINAL_PHASES: readonly TournamentMatch["stage"][] = ["semifinal", "bronze", "final"];
const BIG_STAGES: readonly TournamentLevel[] = ["national", "champions", "chronicles"];

/** Un giudice nei gironi e nel tabellone; nelle fasi finali 2, o 4 nei tornei maggiori. */
export function getStyleJudgeCount(level: TournamentLevel, stage: TournamentMatch["stage"]): number {
  if (!FINAL_PHASES.includes(stage)) return 1;
  return BIG_STAGES.includes(level) ? 4 : 2;
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

export function scoreStyleSheet([bas, mov, din, com, sapd, gcc, dif, sog, pen]: StyleSheet): number {
  // In decimi, come Servizio, per evitare errori di arrotondamento.
  const halfPoints = (bas + mov + din + com + sapd + gcc + dif) * 2;
  return Math.max(0, 55 + halfPoints + sog - 5 * pen) / 10;
}

export interface StyleJudgementInput {
  /** Preparazione Stile del giorno (con la forma) divisa per la media del campo. */
  relativeStyle: number;
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
  const open = assaultChance <= 0.85 && scored > 0;

  // COM: rare, e solo se integrate nel combattimento (no «farming»).
  let com = 0;
  let technique: string | undefined;
  const complexForms = input.forms.filter((form) => COMPLEX_TECHNIQUES[form]);
  const skill = Math.min(1, Math.max(0, level / 2));
  if (open && complexForms.length > 0 && roll() < Math.min(0.12, 0.03 * complexForms.length) * skill) {
    const form = pick(roll, complexForms);
    technique = pick(roll, COMPLEX_TECHNIQUES[form]!);
    const advanced = form !== "form-1" && form !== "form-2";
    com = (advanced ? 1 : 0.5) + (roll() < 0.5 ? 0.5 : 0);
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
  if (scored > 0 && roll() < (0.015 + 0.01 * (sapdOptions.length - 1)) * skill) {
    highlight = pick(roll, sapdOptions);
    sapd = highlight === "Disarmo" ? 1.5 : 1;
  }

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

  const close = scored + conceded === 3 ? 0.5 : 0;
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
