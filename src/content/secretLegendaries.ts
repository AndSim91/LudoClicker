import {
  getLevelForms,
  LEVEL_EXPERIENCE,
  type FormLevel,
  type SecondWeapon,
} from "../game/levelForms";
import type { FormId } from "../game/types";
import type { TournamentCircuitLevel } from "./tournamentSchools";

/**
 * Leggendario Segreto (revisione di Andrea del 07/10). Tre cose distinte:
 * - **valore da torneo** (`tournament`): la preparazione con cui gareggia da
 *   avversario, fissa e scelta dal designer, senza moltiplicatori;
 * - **Forme**: quelle del suo livello (`getLevelForms`), con cui gareggia e
 *   con cui entra a scuola; la seconda arma è la Doppia spada corta per chi
 *   è di Stile, la Staffa per gli altri;
 * - **valori base** (`base`): quelli con cui entra a scuola, con le sue Forme
 *   ed esperienza 0; poi cresce come tutti. Da avversario ha l'esperienza del
 *   suo livello (`LEVEL_EXPERIENCE`), che conta solo nel voto di Stile.
 * Valore a scuola = base × (1 + bonus Forme) × (1 + 0,03 × esperienza).
 */
export interface SecretLegendaryProfile {
  firstName: string;
  lastName: string;
  level: FormLevel;
  /** La sua scuola vera, solo da mostrare: non è una voce del catalogo dei tornei. */
  school: { name: string; city: string; nation: string };
  /** Arena e Stile da avversario. */
  tournament: readonly [arena: number, style: number];
  /** Arena e Stile di base quando entra a scuola; assente se non si recluta. */
  base?: readonly [arena: number, style: number];
  specialty: "arena" | "style" | "complete";
  recruitment?: "trial" | "never";
  defeatRewardEuros?: number;
}

const ALPHA_MILANO = { name: "LudoSport Alpha", city: "Milano", nation: "Italia" };
const ALPHA_TORINO = { name: "LudoSport Alpha", city: "Torino", nation: "Italia" };
const ROMA = { name: "LudoSport Roma", city: "Roma", nation: "Italia" };
// Atleti di un'altra sede dell'Ordine delle Onde, non della scuola del giocatore.
const ONDE_GENOVA = { name: "Ordine delle Onde", city: "Genova", nation: "Italia" };

// Per aggiungere un Leggendario Segreto basta aggiungere una voce: l'ID è la
// chiave del record, il livello decide in quale torneo compare.
export const SECRET_LEGENDARIES = {
  // Accademico (media 100)
  "marco-palena": {
    firstName: "Marco",
    lastName: "Palena",
    level: "academy",
    school: ALPHA_TORINO,
    tournament: [156, 172],
    base: [85, 95],
    specialty: "style",
  },
  "lorenzo-todaro": {
    firstName: "Lorenzo",
    lastName: "Todaro",
    level: "academy",
    school: ALPHA_MILANO,
    tournament: [168, 168],
    base: [90, 90],
    specialty: "complete",
  },
  "elisa-brondolo": {
    firstName: "Elisa",
    lastName: "Brondolo",
    level: "academy",
    school: ALPHA_TORINO,
    tournament: [158, 174],
    base: [86, 96],
    specialty: "style",
  },
  "ruggero-pini": {
    firstName: "Ruggero",
    lastName: "Pini",
    level: "academy",
    school: ONDE_GENOVA,
    tournament: [150, 136],
    base: [82, 74],
    specialty: "arena",
  },
  "adriano-panico": {
    firstName: "Adriano",
    lastName: "Panico",
    level: "academy",
    school: { name: "Ordine delle Onde", city: "Chiavari", nation: "Italia" },
    tournament: [174, 158],
    specialty: "arena",
    recruitment: "never",
    defeatRewardEuros: 500,
  },
  // Nazionale (media 200)
  "pietro-scarica": {
    firstName: "Pietro",
    lastName: "Scarica",
    level: "national",
    school: ROMA,
    tournament: [405, 415],
    base: [112, 115],
    specialty: "complete",
  },
  "piero-dipalo": {
    firstName: "Piero",
    lastName: "Dipalo",
    level: "national",
    school: { name: "LudoSport Adriatica", city: "Ferrara", nation: "Italia" },
    tournament: [372, 378],
    base: [102, 104],
    specialty: "complete",
  },
  "sara-magnifico": {
    firstName: "Sara",
    lastName: "Magnifico",
    level: "national",
    school: ALPHA_MILANO,
    tournament: [358, 402],
    base: [97, 108],
    specialty: "style",
  },
  "daniele-panizza": {
    firstName: "Daniele",
    lastName: "Panizza",
    level: "national",
    school: ALPHA_TORINO,
    tournament: [400, 362],
    base: [108, 98],
    specialty: "arena",
  },
  "marco-brondolo": {
    firstName: "Marco",
    lastName: "Brondolo",
    level: "national",
    school: ALPHA_TORINO,
    tournament: [390, 385],
    base: [106, 105],
    specialty: "complete",
  },
  "daniele-maggi": {
    firstName: "Daniele",
    lastName: "Maggi",
    level: "national",
    school: ALPHA_MILANO,
    tournament: [385, 385],
    specialty: "complete",
    recruitment: "never",
    defeatRewardEuros: 3_000,
  },
  // Champion's Arena (media 400)
  "enrico-giovanetti": {
    firstName: "Enrico",
    lastName: "Giovanetti",
    level: "champions",
    school: ONDE_GENOVA,
    tournament: [810, 730],
    base: [128, 116],
    specialty: "arena",
  },
  "francesco-d-addosio": {
    firstName: "Francesco",
    lastName: "D'Addosio",
    level: "champions",
    school: ROMA,
    tournament: [820, 820],
    base: [125, 125],
    specialty: "complete",
  },
  "jacopo-viola": {
    firstName: "Jacopo",
    lastName: "Viola",
    level: "champions",
    school: ROMA,
    tournament: [755, 835],
    base: [115, 127],
    specialty: "style",
  },
  "pierluigi-chimienti": {
    firstName: "Pierluigi",
    lastName: "Chimienti",
    level: "champions",
    school: { name: "LudoSport Aemilia", city: "Modena", nation: "Italia" },
    tournament: [790, 715],
    base: [124, 112],
    specialty: "arena",
  },
  "marcello-lovo": {
    firstName: "Marcello",
    lastName: "Lovo",
    level: "champions",
    school: { name: "LudoSport Aemilia", city: "Bologna", nation: "Italia" },
    tournament: [740, 820],
    base: [112, 124],
    specialty: "style",
  },
  "simone-pedrazzi": {
    firstName: "Simone",
    lastName: "Pedrazzi",
    level: "champions",
    school: { name: "LudoSport Aemilia", city: "Modena", nation: "Italia" },
    tournament: [760, 840],
    base: [116, 128],
    specialty: "style",
  },
  // Chronicles of Ludosport (media 1.000). La sfida tocca al più debole ancora
  // libero: la forza cresce nell'ordine scelto da Andrea (Girelli, Pini,
  // Rocchitelli, Tonelli, Scalzulli, Jiménez Moyano, Ferrario).
  "antonio-rocchitelli": {
    firstName: "Antonio",
    lastName: "Rocchitelli",
    level: "chronicles",
    school: ALPHA_MILANO,
    tournament: [1_210, 1_090],
    base: [146, 132],
    specialty: "arena",
  },
  "ugo-cesare-tonelli": {
    firstName: "Ugo Cesare",
    lastName: "Tonelli",
    level: "chronicles",
    school: ALPHA_MILANO,
    tournament: [1_195, 1_205],
    base: [142, 142],
    specialty: "complete",
  },
  "paolo-scalzulli": {
    firstName: "Paolo",
    lastName: "Scalzulli",
    level: "chronicles",
    school: ALPHA_MILANO,
    tournament: [1_250, 1_250],
    base: [145, 145],
    specialty: "complete",
  },
  "carlos-jimenez-moyano": {
    firstName: "Carlos",
    lastName: "Jiménez Moyano",
    level: "chronicles",
    school: { name: "LudoSport Spain", city: "", nation: "Spagna" },
    tournament: [1_305, 1_295],
    base: [148, 148],
    specialty: "complete",
  },
  "debora-girelli": {
    firstName: "Debora",
    lastName: "Girelli",
    level: "chronicles",
    school: ALPHA_MILANO,
    tournament: [995, 1_105],
    base: [126, 140],
    specialty: "style",
  },
  "andrea-pini": {
    firstName: "Andrea",
    lastName: "Pini",
    level: "chronicles",
    school: ONDE_GENOVA,
    tournament: [1_160, 1_040],
    base: [143, 129],
    specialty: "arena",
  },
  "lorenzo-ferrario": {
    firstName: "Lorenzo",
    lastName: "Ferrario",
    level: "chronicles",
    school: ALPHA_MILANO,
    tournament: [1_500, 1_500],
    base: [160, 160],
    specialty: "complete",
  },
} as const satisfies Record<string, SecretLegendaryProfile>;

export type SecretLegendaryId = keyof typeof SECRET_LEGENDARIES;

export const SECRET_LEGENDARY_IDS = Object.keys(SECRET_LEGENDARIES) as SecretLegendaryId[];

export function getSecretLegendaryProfile(id: SecretLegendaryId): SecretLegendaryProfile {
  return SECRET_LEGENDARIES[id];
}

export function getChroniclesLegendaryIds(): readonly SecretLegendaryId[] {
  return SECRET_LEGENDARY_IDS.filter((id) => SECRET_LEGENDARIES[id].level === "chronicles");
}

export const SECRET_LEGENDARY_APPEARANCE_CHANCE = 0.1;
export const SECOND_SECRET_LEGENDARY_APPEARANCE_CHANCE = 0.2;

export function getSecretLegendaryIdsForTournament(
  level: TournamentCircuitLevel,
): readonly SecretLegendaryId[] {
  return SECRET_LEGENDARY_IDS.filter((id) => SECRET_LEGENDARIES[id].level === level);
}

export function getSecretLegendarySecondWeapon(id: SecretLegendaryId): SecondWeapon {
  return SECRET_LEGENDARIES[id].specialty === "style" ? "double" : "staff";
}

/** Le Forme del suo livello: le stesse da avversario e a scuola. */
export function getSecretLegendaryForms(id: SecretLegendaryId, courseXUnlocked = false): FormId[] {
  const profile = SECRET_LEGENDARIES[id];
  return getLevelForms(profile.level, getSecretLegendarySecondWeapon(id), courseXUnlocked);
}

export function getSecretLegendaryExperience(id: SecretLegendaryId): number {
  return LEVEL_EXPERIENCE[SECRET_LEGENDARIES[id].level];
}

/** Base con cui entra a scuola (75/75 come un Leggendario normale se non indicata). */
export function getSecretLegendaryBase(id: SecretLegendaryId): readonly [number, number] {
  return getSecretLegendaryProfile(id).base ?? [75, 75];
}
