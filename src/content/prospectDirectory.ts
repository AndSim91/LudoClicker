import { nextRandom } from "../game/random";

/**
 * Rubrica usata per creare i possibili iscritti.
 *
 * Nomi e cognomi sono volutamente separati: ogni nuovo contatto estrae in modo
 * indipendente un elemento da ciascun elenco e poi un provider email.
 */
export const PROSPECT_FIRST_NAMES = [
  "Alberto",
  "Alessandro",
  "Alessia",
  "Alice",
  "Anna",
  "Andrea",
  "Antonio",
  "Aurora",
  "Beatrice",
  "Camilla",
  "Carlo",
  "Caterina",
  "Chiara",
  "Claudio",
  "Cristina",
  "Daniele",
  "Davide",
  "Edoardo",
  "Elena",
  "Emanuele",
  "Enrico",
  "Federica",
  "Filippo",
  "Francesca",
  "Gabriele",
  "Giorgio",
  "Giovanni",
  "Giuseppe",
  "Giulia",
  "Ilaria",
  "Leonardo",
  "Lorenzo",
  "Luca",
  "Ludovica",
  "Maria",
  "Marco",
  "Marta",
  "Martina",
  "Massimo",
  "Matteo",
  "Michele",
  "Niccolò",
  "Paola",
  "Paolo",
  "Pietro",
  "Roberto",
  "Sara",
  "Simone",
  "Sofia",
  "Stefano",
  "Tommaso",
  "Valentina",
  "Veronica",
  "Vittoria",
  "Mauro",
  "Fausto",
  "Ferdinando",
  "Laura Maria",
  "Mariangiangiangelo",
  "Gianluigi",
  "Pier Ferdinando",
  "Silvio",
  "Piersilvio",
  "Attila",
] as const;

export const PROSPECT_LAST_NAMES = [
  "Altone",
  "Barone",
  "Basile",
  "Bellini",
  "Bernardi",
  "Bianchi",
  "Bruzzone",
  "Burlando",
  "Calcagno",
  "Carretto",
  "Caviglia",
  "Colombo",
  "Conti",
  "Costa",
  "De Luca",
  "De Santis",
  "Esposito",
  "Fabbri",
  "Ferrari",
  "Ferroso",
  "Fontana",
  "Ciglione",
  "Gallo",
  "Gentile",
  "Giordano",
  "Greco",
  "Leone",
  "Lombardi",
  "Longo",
  "Mancini",
  "Marino",
  "Martinelli",
  "Martini",
  "Moretti",
  "Neri",
  "Palmieri",
  "Parodi",
  "Pellegrini",
  "Polpaccio",
  "Gastrite",
  "Ricci",
  "Rinaldi",
  "Rizzo",
  "Romano",
  "Rossi",
  "Russo",
  "Salis",
  "Santoro",
  "Serra",
  "Repetto",
  "Piciocchi",
  "Sanguinolento",
  "Polaretto",
  "Maggi",
  "Testa",
  "Todaro",
  "Valentini",
  "Villa",
  "Vitale",
  "Carogna",
] as const;

export const PROSPECT_EMAIL_PROVIDERS = [
  "cmail.com",
  "hotlook.it",
  "yabadabadoo.it",
  "gspot.com",
  "postacenere.it"
] as const;

export interface ProspectIdentity {
  firstName: string;
  lastName: string;
  email: string;
}

function pickRandom<T>(values: readonly T[], roll: number): T {
  return values[Math.min(values.length - 1, Math.floor(roll * values.length))];
}

export function normalizeEmailLocalPart(firstName: string, lastName: string): string {
  return `${firstName}.${lastName}`
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, ".")
    .toLocaleLowerCase("it-IT");
}

export function createProspectEmail(localPart: string, seed: number): string {
  const [providerRoll] = nextRandom(seed);
  return `${localPart}@${pickRandom(PROSPECT_EMAIL_PROVIDERS, providerRoll)}`;
}

export function createRandomProspect(
  seed: number,
  fixedIdentity?: Pick<ProspectIdentity, "firstName" | "lastName">,
): ProspectIdentity {
  const [firstNameRoll, afterFirstName] = nextRandom(seed);
  const [lastNameRoll, afterLastName] = nextRandom(afterFirstName);
  const [providerRoll] = nextRandom(afterLastName);
  const firstName = fixedIdentity?.firstName ?? pickRandom(PROSPECT_FIRST_NAMES, firstNameRoll);
  const lastName = fixedIdentity?.lastName ?? pickRandom(PROSPECT_LAST_NAMES, lastNameRoll);
  const provider = pickRandom(PROSPECT_EMAIL_PROVIDERS, providerRoll);

  return {
    firstName,
    lastName,
    email: `${normalizeEmailLocalPart(firstName, lastName)}@${provider}`,
  };
}
