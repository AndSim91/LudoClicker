import { LUDODEX_LEGENDARIES } from "../../content/ludowiki";
import type { VictoryMomentLevel } from "../../game/moments";
import {
  getLightInflationEventDescription,
  getOfficialSwordUnitCost,
  LIGHT_INFLATION_CAUSES,
  LIGHT_INFLATION_EVENT_TITLE,
  LIGHT_INFLATION_MOMENT,
} from "../../game/lightInflation";
import { formatCurrency, formatStat } from "../../shared/formatters";
import { CHRONICLES_KEY_MOMENT, FOUNDATION_MOMENT, GADGET_MOMENT, SOCIAL_MOMENT, SUPERBA_MOMENT } from "../../game/moments";
import { getReptileFameLevel } from "../../game/reptilePreparation";
import { SUPERBA_COPY } from "../../game/reptileUnlock";
import { GAME_CONFIG } from "../../game/config";
import type { GameState, MomentKey } from "../../game/types";
import { getLegendaryDossier } from "../ludowiki/ludodexPresentation";
import { CONSTELLATION_SIZE, type FoundationStar } from "./constellation";

export type MomentContent =
  | { kind: "council"; kicker: string; title: string; body: string; seats: string[] }
  | {
      kind: "legendary";
      kicker: string;
      title: string;
      body: string;
      secret: boolean;
      initials: string;
      name: string;
      number: string;
      stats: string;
    }
  | { kind: "victory"; kicker: string; title: string; body: string; level: VictoryMomentLevel }
  | {
      kind: "foundation";
      kicker: string;
      title: string;
      body: string;
      number: number;
      stars: FoundationStar[];
      dropped: number;
      previousCity: string;
      newcomerName: string;
      newcomerCity: string;
      tally: string;
    }
  | { kind: "superba"; kicker: string; title: string; body: string; city: string; fameLabel: string }
  | { kind: "chronicles"; kicker: string; title: string; body: string }
  | { kind: "social"; kicker: string; title: string; body: string; followers: number }
  | { kind: "gadget"; kicker: string; title: string; body: string }
  | { kind: "inflation"; kicker: string; title: string; body: string; oldPrice: string; newPrice: string; increase: string };

/** The Consiglio is born with as many seats as collaborators unlock it. */
export const COUNCIL_SEATS = GAME_CONFIG.collaboratorAggregateUnlockCount;

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}

/** «La porta delle Chronicles si apre» (concept A, 05/10/2026). */
const CHRONICLES_KEY_CONTENT: MomentContent = {
  kind: "chronicles",
  kicker: "Arena e Stile nella stessa Champion's Arena",
  title: "La porta delle Chronicles si apre",
  body: "Una Chiave, sei atleti, avversari che non perdono mai. Vinci in Arena o in Stile e un Leggendario Segreto ti sfiderà.",
};

/** «Il telefono» (concept S1, 06/10/2026): the counter runs to the followers of the unlock. */
function describeSocial(followers: number): MomentContent {
  return {
    kind: "social",
    kicker: `${GAME_CONFIG.socialUnlockCollaborators} collaboratori`,
    title: "La Redazione diventa Social",
    body: "La scuola sbarca online. Follower, sponsor e qualche balletto.",
    followers,
  };
}

/** «Il progetto sul banco» (concept G2, 06/10/2026): no names, no prices. */
const GADGET_CONTENT: MomentContent = {
  kind: "gadget",
  kicker: "Champion's Arena vinta",
  title: "Apre il Laboratorio Gadget",
  body: "Una vittoria così va messa su tutto. Il primo progetto è pronto.",
};

const VICTORY_COPY: Record<VictoryMomentLevel, { kicker: string; title: string; note: string }> = {
  national: {
    kicker: "Torneo Nazionale · primo titolo",
    title: "Campioni d'Italia",
    note: "La Rete delle Onde approva la fondazione di una nuova scuola.",
  },
  champions: {
    kicker: "Champion's Arena · prima vittoria",
    title: "In cima alla Champion's Arena",
    note: "Il nome dell'Ordine gira in tutte le sale d'Europa.",
  },
  reptile: {
    kicker: "Reptile · prima vittoria",
    title: "Il Reptile è nostro",
    note: "La coppia dell'Ordine domina la gara a squadre.",
  },
  chronicles: {
    kicker: "Chronicles of Ludosport · prima vittoria",
    title: "Una pagina nelle Chronicles",
    note: "L'Ordine entra nella storia dei Leggendari.",
  },
};

function joinNames(names: readonly string[]): string {
  const unique = [...new Set(names)];
  return unique.length <= 1 ? unique.join("") : `${unique.slice(0, -1).join(", ")} e ${unique.at(-1)}`;
}

function getVictoryWinners(state: GameState, level: VictoryMomentLevel): string[] {
  if (level === "reptile") {
    return [...(state.tournaments.reptile.hall.at(-1)?.athleteNames ?? [])];
  }
  const result = [...state.tournaments.results].reverse().find((candidate) => candidate.level === level);
  if (!result) return [];
  return [result.arenaRanking[0], result.styleRanking[0]]
    .map((id) => result.participants.find((participant) => participant.id === id))
    .filter((participant) => participant?.ownedContactId)
    .map((participant) => `${participant!.firstName} ${participant!.lastName}`);
}

const UNITS = ["", "uno", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove"];
const TEENS = ["dieci", "undici", "dodici", "tredici", "quattordici", "quindici", "sedici", "diciassette", "diciotto", "diciannove"];
const TENS = ["", "", "venti", "trenta", "quaranta", "cinquanta", "sessanta", "settanta", "ottanta", "novanta"];
const FIRST_ORDINALS = ["", "prima", "seconda", "terza", "quarta", "quinta", "sesta", "settima", "ottava", "nona", "decima"];

function cardinal(value: number): string {
  if (value >= 100) {
    const hundreds = Math.floor(value / 100);
    return (hundreds === 1 ? "" : UNITS[hundreds]) + "cento" + (value % 100 ? cardinal(value % 100) : "");
  }
  if (value < 10) return UNITS[value];
  if (value < 20) return TEENS[value - 10];
  const tens = TENS[Math.floor(value / 10)];
  const unit = value % 10;
  if (!unit) return tens;
  return (unit === 1 || unit === 8 ? tens.slice(0, -1) : tens) + UNITS[unit];
}

/** «La seconda sede dell'Ordine», «L'undicesima …»; from the thousandth on, «La sede n° 1.000 …». */
export function getFoundationTitle(value: number): string {
  if (value >= 1000) return `La sede n° ${formatStat(value)} dell'Ordine`;
  let word: string;
  if (value <= 10) word = FIRST_ORDINALS[value];
  else {
    const number = cardinal(value);
    word = number.endsWith("tre") || number.endsWith("sei") ? `${number}esima` : `${number.slice(0, -1)}esima`;
  }
  return `${/^[aeiou]/.test(word) ? "L'" : "La "}${word} sede dell'Ordine`;
}

/** School numbers of the map entries: the Sede madre, then the latest ones (the map keeps 50). */
function getNumberedMap(state: GameState) {
  const map = state.network.schools;
  const offset = state.network.schoolCount - map.length;
  return map.map((school, index) => ({ school, number: index === 0 ? 1 : index + 1 + offset }));
}

/** Nuova sede n° `number` (2 … schoolCount + 1); `generic` hides names and cities (LudoWiki › Scene). */
export function describeFoundation(
  state: GameState,
  number: number,
  { follower = null, generic = false }: { follower?: string | null; generic?: boolean } = {},
): MomentContent {
  const numbered = getNumberedMap(state);
  const map = numbered.filter((entry) => entry.number < number).map((entry) => entry.school);
  const newcomer = number > state.network.schoolCount
    ? state.school
    : numbered.find((entry) => entry.number === number)?.school ?? state.school;
  const previous = map.at(-1);
  // The constellation: the Sede madre and the latest schools left, one star each.
  const starred = map.length <= CONSTELLATION_SIZE ? map : [map[0], ...map.slice(-(CONSTELLATION_SIZE - 1))];
  const brightest = Math.max(1, ...starred.map((school) => school.fame ?? 0));
  const fame = previous?.fame === undefined ? "" : ` con ${formatStat(previous.fame)} di Fama`;
  const lit = Math.min(number, CONSTELLATION_SIZE);
  return {
    kind: "foundation",
    kicker: `Rete delle Onde · Sede n° ${number}${number === CONSTELLATION_SIZE ? " · Simbolo completo" : ""}`,
    title: getFoundationTitle(number),
    body: generic
      ? "Una nuova scuola entra nella Rete delle Onde e accende una stella del simbolo."
      : `${previous?.name ?? "La scuola"} entra nella Rete${fame}; ${newcomer.name} apre a ${newcomer.city}.` +
        (follower ? ` Ti segue ${follower}.` : ""),
    number,
    stars: starred.map((school) => ({ light: school.fame === undefined ? null : Math.sqrt(school.fame / brightest) })),
    dropped: number - 1 - starred.length,
    previousCity: generic ? "" : previous?.city ?? "",
    newcomerName: generic ? "Nuova sede" : newcomer.name,
    newcomerCity: generic ? "" : newcomer.city,
    tally: number > CONSTELLATION_SIZE ? `Simbolo completo · ${number} sedi` : `${lit - 1} → ${lit} di ${CONSTELLATION_SIZE}`,
  };
}

/** Sedi whose scene can be shown by name: the previous school must still be on the map. */
export function getFoundationSceneNumbers(state: GameState): number[] {
  const known = new Set(getNumberedMap(state).map((entry) => entry.number));
  return Array.from({ length: state.network.schoolCount }, (_, index) => state.network.schoolCount + 1 - index)
    .filter((number) => known.has(number - 1));
}

/** The scenes of LudoWiki › Scene: the same moments with generic data. */
export function describeGenericMoment(state: GameState, key: MomentKey): MomentContent {
  if (key === FOUNDATION_MOMENT) return describeFoundation(state, state.network.schoolCount + 1, { generic: true });
  if (key === "legendary") {
    return {
      kind: "legendary",
      secret: false,
      kicker: "Leggendario",
      title: "Un Leggendario entra nell'Ordine",
      body: "Un nuovo nome entra nella scuola e il suo dossier si apre nel Ludodex.",
      name: "Leggendario",
      initials: "?",
      number: "#???",
      stats: "",
    };
  }
  if (key === CHRONICLES_KEY_MOMENT) return CHRONICLES_KEY_CONTENT;
  // Before the unlock of the current school the followers are still zero: Social starts them from the Fama.
  if (key === SOCIAL_MOMENT) return describeSocial(state.unlocks.social ? state.school.followers : state.school.fame);
  if (key === GADGET_MOMENT) return GADGET_CONTENT;
  if (key === SUPERBA_MOMENT) {
    return { kind: "superba", ...SUPERBA_COPY, city: state.school.city, fameLabel: `Fama · livello ${GAME_CONFIG.superbaReptileFameLevel}` };
  }
  if (key === LIGHT_INFLATION_MOMENT) {
    return {
      kind: "inflation",
      kicker: "Lama di Luce · Comunicazione ai rivenditori",
      title: LIGHT_INFLATION_EVENT_TITLE,
      // A random cause every time, like the real September scene.
      body: getLightInflationEventDescription(LIGHT_INFLATION_CAUSES[Math.floor(Math.random() * LIGHT_INFLATION_CAUSES.length)]),
      oldPrice: formatCurrency(GAME_CONFIG.officialSwordCost),
      newPrice: formatCurrency(GAME_CONFIG.officialSwordCost * 1.1),
      increase: "+10%",
    };
  }
  if (key.startsWith("victory:")) {
    const level = key.slice("victory:".length) as VictoryMomentLevel;
    const copy = VICTORY_COPY[level] ?? VICTORY_COPY.national;
    return { kind: "victory", level, kicker: copy.kicker, title: copy.title, body: copy.note };
  }
  return describeMoment(state, key);
}

/** What a queued moment shows, read from the current state. */
export function describeMoment(state: GameState, key: MomentKey): MomentContent {
  if (key === "council") {
    return {
      kind: "council",
      kicker: "Otto collaboratori",
      title: "Nasce il Consiglio delle Onde",
      body: "I Collaboratori hanno scelto i loro rappresentanti: da oggi il Consiglio guida tutte le squadre, settore per settore.",
      seats: state.collaborators.slice(0, COUNCIL_SEATS).map((collaborator) => getInitials(collaborator.displayName)),
    };
  }
  if (key === FOUNDATION_MOMENT) {
    // ponytail: the follower is the first contact of the new school (foundSchool puts it there);
    // the scene plays right after the foundation, before any other Leggendario can join.
    const first = state.contacts[0];
    const follower = first?.specialProfileId && first.status === "enrolled" ? `${first.firstName} ${first.lastName}` : null;
    return describeFoundation(state, state.network.schoolCount + 1, { follower });
  }
  if (key === CHRONICLES_KEY_MOMENT) return CHRONICLES_KEY_CONTENT;
  if (key === SOCIAL_MOMENT) return describeSocial(state.school.followers);
  if (key === GADGET_MOMENT) return GADGET_CONTENT;
  if (key === SUPERBA_MOMENT) {
    const fame = state.tournaments.reptile.fameXp;
    return {
      kind: "superba",
      ...SUPERBA_COPY,
      city: state.school.city,
      fameLabel: `Fama ${formatStat(fame)} · livello ${getReptileFameLevel(fame)}`,
    };
  }
  if (key === LIGHT_INFLATION_MOMENT) {
    const price = getOfficialSwordUnitCost(state);
    const increase = state.lightInflation.event?.increase ?? 0.1;
    return {
      kind: "inflation",
      kicker: "Lama di Luce · Comunicazione ai rivenditori",
      title: LIGHT_INFLATION_EVENT_TITLE,
      body: getLightInflationEventDescription(state.lightInflation.event?.cause ?? LIGHT_INFLATION_CAUSES[0]),
      oldPrice: formatCurrency(price / (1 + increase)),
      newPrice: formatCurrency(price),
      increase: `+${Math.round(increase * 100)}%`,
    };
  }
  if (key.startsWith("victory:")) {
    const level = key.slice("victory:".length) as VictoryMomentLevel;
    const copy = VICTORY_COPY[level] ?? VICTORY_COPY.national;
    const superba = level === "reptile" && state.tournaments.reptile.hall.at(-1)?.superba;
    const winners = getVictoryWinners(state, level);
    return {
      kind: "victory",
      level,
      kicker: superba ? "Torneo della Superba · prima vittoria" : copy.kicker,
      title: superba ? "La Superba è nostra" : copy.title,
      body: `${winners.length > 0 ? `Titolo per ${joinNames(winners)}. ` : ""}${copy.note}`,
    };
  }
  const profileId = key.slice("legendary:".length);
  const index = LUDODEX_LEGENDARIES.findIndex((legendary) => legendary.id === profileId);
  const legendary = LUDODEX_LEGENDARIES[index];
  const secret = legendary?.kind === "secret";
  const name = legendary ? `${legendary.firstName} ${legendary.lastName}` : "Un nuovo Leggendario";
  const dossier = legendary ? getLegendaryDossier(state, legendary) : undefined;
  return {
    kind: "legendary",
    secret,
    kicker: secret ? "Leggendario Segreto" : "Leggendario",
    title: secret ? "Un Leggendario Segreto entra nell'Ordine" : "Un Leggendario entra nell'Ordine",
    body: `${name} entra nella scuola. I suoi dati sono salvati nel Ludodex.`,
    name,
    initials: legendary ? `${legendary.firstName.charAt(0)}${legendary.lastName.charAt(0)}` : "?",
    number: `#${String(index + 1).padStart(3, "0")}`,
    stats: dossier
      ? `Arena ${Math.round(dossier.arenaBase)} · Stile ${Math.round(dossier.styleBase)}`
      : "",
  };
}
