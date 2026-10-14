/**
 * Dalle partite alle risposte: per ogni domanda mediana, 10% più veloce e 10%
 * più lento (minuti effettivi), più quante partite ci sono arrivate.
 */
import { SECRET_LEGENDARIES } from "../content/secretLegendaries";
import { UPGRADE_DEFINITIONS } from "../content/upgrades";
import type { Evento, RegistroPartita } from "./partita";

export interface Distribuzione {
  partite: number;
  raggiunte: number;
  p10?: number;
  p50?: number;
  p90?: number;
}

export function distribuzione(valori: (number | undefined)[]): Distribuzione {
  const presenti = valori.filter((value): value is number => value !== undefined && Number.isFinite(value))
    .sort((left, right) => left - right);
  const at = (q: number) => presenti[Math.min(presenti.length - 1, Math.max(0, Math.ceil(presenti.length * q) - 1))];
  return presenti.length === 0
    ? { partite: valori.length, raggiunte: 0 }
    : { partite: valori.length, raggiunte: presenti.length, p10: at(0.1), p50: at(0.5), p90: at(0.9) };
}

function primo(registro: RegistroPartita, filtro: (evento: Evento) => boolean): Evento | undefined {
  return registro.eventi.find(filtro);
}

/** Minuto d'inizio di ogni scuola nella partita (la 1 parte da 0). */
function inizioScuole(registro: RegistroPartita): Map<number, number> {
  const inizi = new Map<number, number>([[1, 0]]);
  for (const evento of registro.eventi) {
    if (!inizi.has(evento.scuola)) inizi.set(evento.scuola, evento.t);
  }
  return inizi;
}

export const TAPPE: { tipo: string; chiave: string; etichetta: string }[] = [
  { tipo: "iscritti", chiave: "10", etichetta: "10 iscritti (Forme, Istruttori, Tornei)" },
  { tipo: "sblocco", chiave: "forme", etichetta: "Forme aperte" },
  { tipo: "tappa", chiave: "primo-scolastico", etichetta: "1ª tappa: primo Torneo Scolastico" },
  { tipo: "collaboratori", chiave: "4", etichetta: "4 collaboratori" },
  { tipo: "collaboratori", chiave: "8", etichetta: "8 collaboratori" },
  { tipo: "sblocco", chiave: "consiglio", etichetta: "2ª tappa: Consiglio delle Onde" },
  { tipo: "iscritti", chiave: "100", etichetta: "100 iscritti" },
  { tipo: "titolo", chiave: "accademico", etichetta: "Primo titolo all'Accademico (prestigio)" },
  { tipo: "collaboratori", chiave: "15", etichetta: "15 collaboratori (Social)" },
  { tipo: "iscritti", chiave: "1000", etichetta: "1.000 iscritti" },
  { tipo: "titolo", chiave: "nazionale", etichetta: "3ª tappa: vittoria al Nazionale (Gadget)" },
  { tipo: "titolo", chiave: "reptile", etichetta: "Vittoria al Reptile" },
  { tipo: "titolo", chiave: "champions", etichetta: "5ª tappa: vittoria alla Champion's Arena" },
  { tipo: "sblocco", chiave: "chronicles", etichetta: "Chronicles sbloccate" },
  { tipo: "titolo", chiave: "chronicles", etichetta: "Vittoria alle Chronicles" },
  { tipo: "iscritti", chiave: "10000", etichetta: "10.000 iscritti" },
  { tipo: "iscritti", chiave: "100000", etichetta: "100.000 iscritti" },
  { tipo: "upgrade-completi", chiave: "tutti", etichetta: "Tutti gli Upgrade al massimo" },
];

export const SCUOLE_MOSTRATE = [1, 2, 3, 5, 10, 20];

/** Tappe misurate dall'inizio di ciascuna scuola. */
export function tappePerScuola(registri: RegistroPartita[]) {
  return TAPPE.map((tappa) => ({
    ...tappa,
    scuole: Object.fromEntries(SCUOLE_MOSTRATE.map((scuola) => {
      const valori = registri.filter((registro) => registro.scuoleRaggiunte >= scuola).map((registro) => {
        const inizio = inizioScuole(registro).get(scuola) ?? 0;
        const evento = primo(registro, (e) => e.scuola === scuola && e.tipo === tappa.tipo && e.chiave === tappa.chiave);
        return evento ? evento.t - inizio : undefined;
      });
      return [scuola, distribuzione(valori)];
    })) as Record<number, Distribuzione>,
  }));
}

/** Tempo totale per arrivare alla scuola n, e durata di ogni scuola. */
export function scuole(registri: RegistroPartita[]) {
  const massimo = Math.max(1, ...registri.map((registro) => registro.scuoleRaggiunte));
  return Array.from({ length: massimo }, (_, index) => {
    const numero = index + 1;
    const arrivo = registri.map((registro) => inizioScuole(registro).get(numero));
    const durata = registri.map((registro) => {
      const inizi = inizioScuole(registro);
      const start = inizi.get(numero);
      if (start === undefined) return undefined;
      const end = inizi.get(numero + 1) ?? (registro.scuoleRaggiunte === numero ? registro.minutiTotali : undefined);
      return end === undefined ? undefined : end - start;
    });
    const anni = registri.map((registro) => {
      const years = registro.eventi.filter((evento) => evento.scuola === numero && evento.tipo === "anno").length;
      return inizioScuole(registro).has(numero) ? years : undefined;
    });
    return { numero, arrivo: distribuzione(arrivo), durata: distribuzione(durata), anni: distribuzione(anni) };
  });
}

/** Leggendari Segreti: prima sconfitta in torneo e iscrizione, per torneo; e il gruppo intero. */
export function leggendariSegreti(registri: RegistroPartita[]) {
  const livelli = ["academy", "national", "champions", "chronicles"] as const;
  return livelli.map((livello) => {
    const ids = Object.entries(SECRET_LEGENDARIES)
      .filter(([, profile]) => profile.level === livello)
      .map(([id]) => id);
    const persone = ids.map((id) => {
      const profile = SECRET_LEGENDARIES[id as keyof typeof SECRET_LEGENDARIES];
      const sconfitto = registri.map((registro) =>
        primo(registro, (e) => e.tipo === "segreto" && e.chiave === id && (e.valore ?? 0) > 0)?.t);
      const iscritto = registri.map((registro) =>
        primo(registro, (e) => e.tipo === "segreto" && e.chiave === id && e.dati?.stato === "enrolled")?.t);
      return {
        id,
        nome: `${profile.firstName} ${profile.lastName}`,
        sconfitto: distribuzione(sconfitto),
        iscritto: distribuzione(iscritto),
      };
    });
    const tuttiIscritti = registri.map((registro) => {
      const tempi = ids.map((id) =>
        primo(registro, (e) => e.tipo === "segreto" && e.chiave === id && e.dati?.stato === "enrolled")?.t);
      return tempi.every((t) => t !== undefined) ? Math.max(...(tempi as number[])) : undefined;
    });
    return { livello, persone, tuttiIscritti: distribuzione(tuttiIscritti) };
  });
}

/** Leggendari normali: quando arrivano (prima volta nella partita). */
export function leggendari(registri: RegistroPartita[]) {
  const ids = new Set(registri.flatMap((registro) =>
    registro.eventi.filter((e) => e.tipo === "leggendario").map((e) => e.chiave!)));
  return [...ids].map((id) => ({
    id,
    arrivo: distribuzione(registri.map((registro) =>
      primo(registro, (e) => e.tipo === "leggendario" && e.chiave === id)?.t)),
  })).sort((left, right) => (left.arrivo.p50 ?? Infinity) - (right.arrivo.p50 ?? Infinity));
}

/** Upgrade: primo acquisto (livello 1) e livello massimo, quante partite li comprano. */
export function upgrade(registri: RegistroPartita[]) {
  return UPGRADE_DEFINITIONS.filter((definition) => !definition.hidden).map((definition) => {
    const primoAcquisto = registri.map((registro) =>
      primo(registro, (e) => e.tipo === "upgrade" && e.chiave === definition.id && e.valore === 1)?.t);
    const massimo = registri.map((registro) =>
      primo(registro, (e) => e.tipo === "upgrade" && e.chiave === definition.id && e.valore === definition.maxLevel)?.t);
    return {
      id: definition.id,
      titolo: definition.title,
      ramo: definition.category,
      livelli: definition.maxLevel,
      primoAcquisto: distribuzione(primoAcquisto),
      massimo: distribuzione(massimo),
    };
  }).sort((left, right) => (left.primoAcquisto.p50 ?? Infinity) - (right.primoAcquisto.p50 ?? Infinity));
}

export const MATERIE = ["enrollment", "loyalty", "teaching", "tournaments", "administration", "finances"] as const;
export const NOMI_MATERIE: Record<(typeof MATERIE)[number], string> = {
  enrollment: "Iscrizioni",
  loyalty: "Fidelizzazione",
  teaching: "Didattica",
  tournaments: "Risultati Agonistici",
  administration: "Amministrazione",
  finances: "Finanze",
};
export const VOTI = ["A", "B", "C", "D", "E"] as const;
type Conteggio = Record<(typeof VOTI)[number], number>;

function vuoto(): Conteggio {
  return { A: 0, B: 0, C: 0, D: 0, E: 0 };
}

/** Pagelle: voti per materia, per anno della scuola e per dimensione della scuola. */
export function pagelle(registri: RegistroPartita[]) {
  const totale = Object.fromEntries(MATERIE.map((materia) => [materia, vuoto()])) as Record<string, Conteggio>;
  const perAnno = new Map<number, Record<string, Conteggio>>();
  const fasce = [
    { nome: "fino a 100 iscritti", max: 100 },
    { nome: "101–1.000", max: 1_000 },
    { nome: "1.001–10.000", max: 10_000 },
    { nome: "oltre 10.000", max: Infinity },
  ];
  const perFascia = fasce.map(() =>
    Object.fromEntries(MATERIE.map((materia) => [materia, vuoto()])) as Record<string, Conteggio>);
  const crolli = new Map<number, number>();
  for (const registro of registri) {
    const contatoreAnno = new Map<number, number>();
    for (const evento of registro.eventi) {
      if (evento.tipo !== "pagella") continue;
      const voti = (evento.dati?.voti ?? {}) as Record<string, string | null>;
      const annoScuola = (contatoreAnno.get(evento.scuola) ?? 0) + 1;
      contatoreAnno.set(evento.scuola, annoScuola);
      const iscritti = Number(evento.dati?.iscritti ?? 0);
      const fascia = fasce.findIndex((candidate) => iscritti <= candidate.max);
      let basse = 0;
      for (const materia of MATERIE) {
        const voto = voti[materia] as (typeof VOTI)[number] | null;
        if (!voto) continue;
        totale[materia][voto] += 1;
        const anno = perAnno.get(annoScuola) ?? Object.fromEntries(MATERIE.map((m) => [m, vuoto()])) as Record<string, Conteggio>;
        anno[materia][voto] += 1;
        perAnno.set(annoScuola, anno);
        perFascia[fascia][materia][voto] += 1;
        if (voto === "D" || voto === "E") basse += 1;
      }
      if (basse >= 3) crolli.set(annoScuola, (crolli.get(annoScuola) ?? 0) + 1);
    }
  }
  return {
    totale,
    perAnno: [...perAnno.entries()].sort((left, right) => left[0] - right[0]).slice(0, 25),
    perFascia: fasce.map((fascia, index) => ({ fascia: fascia.nome, voti: perFascia[index] })),
    crolli: [...crolli.entries()].sort((left, right) => left[0] - right[0]),
  };
}

/** Reputazione a ogni fondazione, voce per voce. */
export function reputazione(registri: RegistroPartita[]) {
  const perScuola = new Map<number, { punti: number[]; voci: Record<string, number[]>; upgrade: number[] }>();
  for (const registro of registri) {
    for (const evento of registro.eventi) {
      if (evento.tipo !== "fondazione" || evento.chiave === "disponibile") continue;
      const numero = Number(evento.chiave) - 1;
      const entry = perScuola.get(numero) ?? { punti: [], voci: {}, upgrade: [] };
      entry.punti.push(evento.valore ?? 0);
      const voci = (evento.dati?.voci ?? {}) as Record<string, unknown>;
      for (const [chiave, valore] of Object.entries(voci)) {
        const numeric = typeof valore === "boolean" ? Number(valore) : typeof valore === "number" ? valore : typeof valore === "string" ? 1 : 0;
        (entry.voci[chiave] ??= []).push(numeric);
      }
      entry.upgrade.push(Number(evento.dati?.upgradeComprati ?? 0));
      perScuola.set(numero, entry);
    }
  }
  return [...perScuola.entries()].sort((left, right) => left[0] - right[0]).map(([scuola, entry]) => ({
    scuola,
    punti: distribuzione(entry.punti),
    upgradeComprati: distribuzione(entry.upgrade),
    voci: Object.fromEntries(Object.entries(entry.voci).map(([chiave, valori]) => [chiave, distribuzione(valori)])),
  }));
}

/** Tornei: per livello, miglior piazzamento di ogni edizione in Arena e Stile. */
export function tornei(registri: RegistroPartita[]) {
  const livelli = new Map<string, { arena: number[]; stile: number[]; edizioni: number }>();
  for (const registro of registri) {
    for (const evento of registro.eventi) {
      if (evento.tipo !== "torneo") continue;
      const entry = livelli.get(evento.chiave!) ?? { arena: [], stile: [], edizioni: 0 };
      entry.edizioni += 1;
      if (typeof evento.dati?.arena === "number") entry.arena.push(evento.dati.arena);
      if (typeof evento.dati?.stile === "number") entry.stile.push(evento.dati.stile);
      livelli.set(evento.chiave!, entry);
    }
  }
  return [...livelli.entries()].map(([livello, entry]) => ({
    livello,
    edizioniPerPartita: entry.edizioni / Math.max(1, registri.length),
    arena: distribuzione(entry.arena),
    stile: distribuzione(entry.stile),
    vinteArena: entry.arena.filter((posto) => posto === 1).length / Math.max(1, entry.edizioni),
    vinteStile: entry.stile.filter((posto) => posto === 1).length / Math.max(1, entry.edizioni),
  }));
}

export function velocita(registri: RegistroPartita[]) {
  return [2, 3, 4, 5].map((speed) => ({
    velocita: speed,
    quando: distribuzione(registri.map((registro) =>
      primo(registro, (e) => e.tipo === "velocita" && e.chiave === String(speed))?.t)),
  }));
}

export function salute(registri: RegistroPartita[]) {
  return {
    errori: registri.flatMap((registro) => registro.errori.map((errore) => `partita ${registro.seed}: ${errore}`)),
    msPerTick: distribuzione(registri.map((registro) => registro.msMotore / Math.max(1, registro.tick))),
    minutiPerPartita: distribuzione(registri.map((registro) => registro.minutiTotali)),
    scuoleRaggiunte: distribuzione(registri.map((registro) => registro.scuoleRaggiunte)),
  };
}

export function analizza(registri: RegistroPartita[]) {
  return {
    partite: registri.length,
    tappe: tappePerScuola(registri),
    scuole: scuole(registri),
    leggendari: leggendari(registri),
    segreti: leggendariSegreti(registri),
    upgrade: upgrade(registri),
    pagelle: pagelle(registri),
    reputazione: reputazione(registri),
    tornei: tornei(registri),
    velocita: velocita(registri),
    salute: salute(registri),
  };
}

export type Analisi = ReturnType<typeof analizza>;
