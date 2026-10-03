import { LUDODEX_LEGENDARIES } from "../../content/ludowiki";
import type { VictoryMomentLevel } from "../../game/moments";
import { getEverEnrolledLegendaryIds } from "../../game/moments";
import type { GameState, MomentKey } from "../../game/types";
import { getLegendaryDossier } from "../ludowiki/ludodexPresentation";

export type MomentContent =
  | { kind: "council"; kicker: string; title: string; body: string }
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
  | { kind: "foundation"; kicker: string; title: string; body: string; from: string; to: string };

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

/** What a queued moment shows, read from the current state. */
export function describeMoment(state: GameState, key: MomentKey): MomentContent {
  if (key === "council") {
    const first = state.collaborators[0]?.displayName;
    return {
      kind: "council",
      kicker: "Primo collaboratore",
      title: "Nasce il Consiglio delle Onde",
      body: `${first ? `${first} prende il primo posto al tavolo. ` : ""}Da oggi l'Ordine non lavora più da solo.`,
    };
  }
  if (key === "foundation") {
    const previous = state.network.schools.at(-1);
    const from = previous ? `${previous.name} · ${previous.city}` : "Sede madre";
    const to = `${state.school.name} · ${state.school.city}`;
    return {
      kind: "foundation",
      kicker: "Rete dell'Ordine",
      title: "Una nuova sede per l'Ordine",
      body: `${previous?.name ?? "La scuola"} entra nella Rete; ${state.school.name} apre a ${state.school.city}.`,
      from,
      to,
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
