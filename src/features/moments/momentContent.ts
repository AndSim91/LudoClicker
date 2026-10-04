import { LUDODEX_LEGENDARIES } from "../../content/ludowiki";
import type { VictoryMomentLevel } from "../../game/moments";
import {
  getLightInflationEventDescription,
  getOfficialSwordUnitCost,
  LIGHT_INFLATION_CAUSES,
  LIGHT_INFLATION_EVENT_TITLE,
  LIGHT_INFLATION_MOMENT,
} from "../../game/lightInflation";
import { getEverEnrolledLegendaryIds } from "../../game/moments";
import { formatCurrency, formatStat } from "../../shared/formatters";
import { FOUNDATION_MOMENT } from "../../game/moments";
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
  | { kind: "inflation"; kicker: string; title: string; body: string; oldPrice: string; newPrice: string; increase: string };

/** The Consiglio is born with as many seats as collaborators unlock it. */
export const COUNCIL_SEATS = GAME_CONFIG.collaboratorAggregateUnlockCount;

function getInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
}

const VICTORY_COPY: Record<VictoryMomentLevel, { kicker: string; title: string; note: string }> = {
  national: {
    kicker: "Torneo Nazionale · primo titolo",
    title: "Campioni d'Italia",
    note: "La Rete dell'Ordine approva la fondazione di una nuova scuola.",
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

/** What a queued moment shows, read from the current state. */
export function describeMoment(state: GameState, key: MomentKey): MomentContent {
  if (key === "council") {
    return {
      kind: "council",
      kicker: "Otto collaboratori",
      title: "Nasce il Consiglio delle Onde",
      body: "Un tavolo rotondo, otto sedie, nessuno a capotavola. I collaboratori non sono più sparsi: da oggi il Consiglio guida tutta la squadra, settore per settore.",
      seats: state.collaborators.slice(0, COUNCIL_SEATS).map((collaborator) => getInitials(collaborator.displayName)),
    };
  }
  if (key === FOUNDATION_MOMENT) {
    const number = state.network.schoolCount + 1;
    const map = state.network.schools;
    const previous = map.at(-1);
    // The constellation: the Sede madre and the latest schools left, one star each.
    const starred = map.length <= CONSTELLATION_SIZE ? map : [map[0], ...map.slice(-(CONSTELLATION_SIZE - 1))];
    const brightest = Math.max(1, ...starred.map((school) => school.fame ?? 0));
    // ponytail: the follower is the first contact of the new school (foundSchool puts it there);
    // the scene plays right after the foundation, before any other Leggendario can join.
    const first = state.contacts[0];
    const follower = first?.specialProfileId && first.status === "enrolled" ? `${first.firstName} ${first.lastName}` : null;
    const fame = previous?.fame === undefined ? "" : ` con ${formatStat(previous.fame)} di Fama`;
    const lit = Math.min(number, CONSTELLATION_SIZE);
    return {
      kind: "foundation",
      kicker: `Rete dell'Ordine · Sede n° ${number}${number === CONSTELLATION_SIZE ? " · Simbolo completo" : ""}`,
      title: getFoundationTitle(number),
      body: `${previous?.name ?? "La scuola"} entra nella Rete${fame}; ${state.school.name} apre a ${state.school.city}.` +
        (follower ? ` Ti segue ${follower}.` : ""),
      number,
      stars: starred.map((school) => ({ light: school.fame === undefined ? null : Math.sqrt(school.fame / brightest) })),
      dropped: state.network.schoolCount - starred.length,
      previousCity: previous?.city ?? "",
      newcomerName: state.school.name,
      newcomerCity: state.school.city,
      tally: number > CONSTELLATION_SIZE ? `Simbolo completo · ${number} sedi` : `${lit - 1} → ${lit} di ${CONSTELLATION_SIZE}`,
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
  const discovered = getEverEnrolledLegendaryIds(state).length;
  const secret = legendary?.kind === "secret";
  const name = legendary ? `${legendary.firstName} ${legendary.lastName}` : "Un nuovo Leggendario";
  const dossier = legendary ? getLegendaryDossier(state, legendary) : undefined;
  return {
    kind: "legendary",
    secret,
    kicker: secret ? "Leggendario Segreto" : "Leggendario",
    title: secret ? "Un Leggendario Segreto entra nell'Ordine" : "Un Leggendario entra nell'Ordine",
    body: `${name} entra nella scuola. Il suo dossier si apre nel Ludodex: ${discovered} / ${LUDODEX_LEGENDARIES.length}.`,
    name,
    initials: legendary ? `${legendary.firstName.charAt(0)}${legendary.lastName.charAt(0)}` : "?",
    number: `#${String(index + 1).padStart(3, "0")}`,
    stats: dossier
      ? `Arena ${Math.round(dossier.arenaBase)} · Stile ${Math.round(dossier.styleBase)}`
      : "",
  };
}
