import {
  getTournamentSchool,
  type TournamentCircuitLevel,
  type TournamentSchoolId,
} from "./tournamentSchools";

export interface SecretLegendaryProfile {
  firstName: string;
  lastName: string;
  schoolId?: TournamentSchoolId;
  arenaBase: number;
  styleBase: number;
  numericForms: number;
  externalExperience: number;
  specialty: "arena" | "style" | "complete";
  recruitment?: "trial" | "never";
  defeatRewardEuros?: number;
}

// Per aggiungere un Leggendario Segreto basta aggiungere una voce al catalogo
// e collegarla a una scuola esistente tramite schoolId. L'ID viene derivato
// automaticamente dalla chiave del record. I valori base qui configurati sono
// fissi e indipendenti dalla difficoltà del circuito. La simulazione applica
// soltanto le Forme e l'esperienza configurate sul profilo. Per i profili
// collegati ai tornei, il numeratore rende esplicita la preparazione finale
// scelta dal designer e il denominatore rimuove i modificatori personali.
export const SECRET_LEGENDARIES = {
  "marco-palena": {
    firstName: "Marco",
    lastName: "Palena",
    schoolId: "alpha-ordine-degli-elementi",
    arenaBase: 140 / (1.4 * 1.15),
    styleBase: 155 / (1.4 * 1.15),
    numericForms: 4,
    externalExperience: 5,
    specialty: "style",
  },
  "lorenzo-todaro": {
    firstName: "Lorenzo",
    lastName: "Todaro",
    schoolId: "alpha-ordine-della-cripta",
    arenaBase: 151 / (1.5 * 1.15),
    styleBase: 151 / (1.5 * 1.15),
    numericForms: 5,
    externalExperience: 5,
    specialty: "complete",
  },
  "francesco-d-addosio": {
    firstName: "Francesco",
    lastName: "D'Addosio",
    schoolId: undefined,
    arenaBase: 1_200,
    styleBase: 1_200,
    numericForms: 7,
    externalExperience: 20,
    specialty: "complete",
  },
  "pietro-scarica": {
    firstName: "Pietro",
    lastName: "Scarica",
    schoolId: "italia-roma",
    arenaBase: 220 / (1.5 * 1.3),
    styleBase: 230 / (1.5 * 1.3),
    numericForms: 5,
    externalExperience: 10,
    specialty: "complete",
  },
  "daniele-panizza": {
    firstName: "Daniele",
    lastName: "Panizza",
    schoolId: "alpha-ordine-degli-elementi",
    arenaBase: 155 / (1.4 * 1.15),
    styleBase: 140 / (1.4 * 1.15),
    numericForms: 4,
    externalExperience: 5,
    specialty: "complete",
  },
  "sara-magnifico": {
    firstName: "Sara",
    lastName: "Magnifico",
    schoolId: "alpha-ordine-della-cripta",
    arenaBase: 130 / (1.5 * 1.15),
    styleBase: 165 / (1.5 * 1.15),
    numericForms: 5,
    externalExperience: 5,
    specialty: "style",
  },
  "paolo-scalzulli": {
    firstName: "Paolo",
    lastName: "Scalzulli",
    schoolId: undefined,
    arenaBase: 1_200,
    styleBase: 1_200,
    numericForms: 0,
    externalExperience: 0,
    specialty: "complete",
  },
  "lorenzo-ferrario": {
    firstName: "Lorenzo",
    lastName: "Ferrario",
    schoolId: undefined,
    arenaBase: 1_500,
    styleBase: 1_500,
    numericForms: 0,
    externalExperience: 0,
    specialty: "complete",
  },
  "antonio-rocchitelli": {
    firstName: "Antonio",
    lastName: "Rocchitelli",
    schoolId: undefined,
    arenaBase: 1_080,
    styleBase: 1_080,
    numericForms: 0,
    externalExperience: 0,
    specialty: "complete",
  },
  "ugo-cesare-tonelli": {
    firstName: "Ugo Cesare",
    lastName: "Tonelli",
    schoolId: undefined,
    arenaBase: 1_199,
    styleBase: 1_199,
    numericForms: 0,
    externalExperience: 0,
    specialty: "complete",
  },
  "enrico-giovanetti": {
    firstName: "Enrico",
    lastName: "Giovanetti",
    schoolId: undefined,
    arenaBase: 1_020,
    styleBase: 1_020,
    numericForms: 0,
    externalExperience: 0,
    specialty: "complete",
  },
  "piero-dipalo": {
    firstName: "Piero",
    lastName: "Dipalo",
    schoolId: "italia-adriatica",
    arenaBase: 200,
    styleBase: 210,
    numericForms: 0,
    externalExperience: 0,
    specialty: "complete",
  },
  "daniele-maggi": {
    firstName: "Daniele",
    lastName: "Maggi",
    schoolId: "alpha-ordine-della-cripta",
    arenaBase: 140,
    styleBase: 140,
    numericForms: 0,
    externalExperience: 0,
    specialty: "complete",
    recruitment: "never",
    defeatRewardEuros: 30,
  },
  "carlos-jimenez-moyano": {
    firstName: "Carlos",
    lastName: "Jiménez Moyano",
    schoolId: undefined,
    arenaBase: 1_201,
    styleBase: 1_199,
    numericForms: 0,
    externalExperience: 0,
    specialty: "complete",
  },
  "simone-pedrazzi": {
    firstName: "Simone",
    lastName: "Pedrazzi",
    schoolId: "italia-aemilia",
    arenaBase: 200,
    styleBase: 225,
    numericForms: 0,
    externalExperience: 0,
    specialty: "complete",
  },
} as const satisfies Record<string, SecretLegendaryProfile>;

export type SecretLegendaryId = keyof typeof SECRET_LEGENDARIES;

export const SECRET_LEGENDARY_IDS = Object.keys(SECRET_LEGENDARIES) as SecretLegendaryId[];

export function getChroniclesLegendaryIds(): readonly SecretLegendaryId[] {
  return SECRET_LEGENDARY_IDS.filter((id) => SECRET_LEGENDARIES[id].schoolId === undefined);
}

export const SECRET_LEGENDARY_APPEARANCE_CHANCE = 0.1;
export const SECOND_SECRET_LEGENDARY_APPEARANCE_CHANCE = 0.2;

export function getSecretLegendaryIdsForTournament(
  level: TournamentCircuitLevel,
): readonly SecretLegendaryId[] {
  return SECRET_LEGENDARY_IDS.filter((id) => {
    const schoolId = SECRET_LEGENDARIES[id].schoolId;
    return schoolId !== undefined && getTournamentSchool(schoolId).level === level;
  });
}
