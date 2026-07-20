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
  specialty: "style" | "complete";
  recruitment?: "trial" | "never";
  defeatRewardEuros?: number;
}

// Per aggiungere un Leggendario Segreto basta aggiungere una voce al catalogo
// e collegarla a una scuola esistente tramite schoolId. L'ID viene derivato
// automaticamente dalla chiave del record.
export const SECRET_LEGENDARIES = {
  "marco-palena": {
    firstName: "Marco",
    lastName: "Palena",
    schoolId: "alpha-ordine-degli-elementi",
    arenaBase: 75,
    styleBase: 90,
    numericForms: 4,
    externalExperience: 5,
    specialty: "style",
  },
  "lorenzo-todaro": {
    firstName: "Lorenzo",
    lastName: "Todaro",
    schoolId: "alpha-ordine-della-cripta",
    arenaBase: 80,
    styleBase: 80,
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
    arenaBase: 92,
    styleBase: 94,
    numericForms: 5,
    externalExperience: 10,
    specialty: "complete",
  },
  "daniele-panizza": {
    firstName: "Daniele",
    lastName: "Panizza",
    schoolId: "alpha-ordine-degli-elementi",
    arenaBase: 81,
    styleBase: 62,
    numericForms: 4,
    externalExperience: 5,
    specialty: "complete",
  },
  "sara-magnifico": {
    firstName: "Sara",
    lastName: "Magnifico",
    schoolId: "alpha-ordine-della-cripta",
    arenaBase: 58,
    styleBase: 87,
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
    arenaBase: 169,
    styleBase: 169,
    numericForms: 0,
    externalExperience: 0,
    specialty: "complete",
  },
  "daniele-maggi": {
    firstName: "Daniele",
    lastName: "Maggi",
    schoolId: "alpha-ordine-della-cripta",
    arenaBase: 150,
    styleBase: 150,
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
    arenaBase: 122,
    styleBase: 145,
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

export function getSecretLegendaryIdsForTournament(
  level: TournamentCircuitLevel,
): readonly SecretLegendaryId[] {
  return SECRET_LEGENDARY_IDS.filter((id) => {
    const schoolId = SECRET_LEGENDARIES[id].schoolId;
    return schoolId !== undefined && getTournamentSchool(schoolId).level === level;
  });
}
