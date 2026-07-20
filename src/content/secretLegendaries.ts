import {
  getTournamentSchool,
  type TournamentCircuitLevel,
  type TournamentSchoolId,
} from "./tournamentSchools";

export interface SecretLegendaryProfile {
  firstName: string;
  lastName: string;
  schoolId: TournamentSchoolId;
  arenaBase: number;
  styleBase: number;
  numericForms: number;
  externalExperience: number;
  specialty: "style" | "complete";
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
} as const satisfies Record<string, SecretLegendaryProfile>;

export type SecretLegendaryId = keyof typeof SECRET_LEGENDARIES;

export const SECRET_LEGENDARY_IDS = Object.keys(SECRET_LEGENDARIES) as SecretLegendaryId[];

export const SECRET_LEGENDARY_APPEARANCE_CHANCE = 0.1;

export function getSecretLegendaryIdsForTournament(
  level: TournamentCircuitLevel,
): readonly SecretLegendaryId[] {
  return SECRET_LEGENDARY_IDS.filter((id) =>
    getTournamentSchool(SECRET_LEGENDARIES[id].schoolId).level === level
  );
}
