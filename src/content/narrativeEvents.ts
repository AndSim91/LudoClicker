import type { NarrativeEventId } from "../game/types";

export interface NarrativeEventDefinition {
  id: NarrativeEventId;
  title: string;
  description: string;
  tone: "positive" | "neutral";
  kind: "positive" | "negative" | "absurd";
  minMembers: number;
  euroDelta?: number;
  contactDelta?: number;
  wearDelta?: number;
  damagedSwordsDelta?: number;
  repairedSwordsDelta?: number;
}

export const MISSED_RENEWAL_EVENT = {
  id: "missed-renewal",
  title: "Mancato rinnovo",
  description: "Un iscritto che non ha iniziato corsi durante l'anno scolastico non ha rinnovato la partecipazione.",
  tone: "neutral",
  kind: "negative",
  minMembers: 2,
} satisfies NarrativeEventDefinition;

export const NARRATIVE_EVENTS: NarrativeEventDefinition[] = [
  { id: "word-of-mouth", title: "Passaparola inatteso", description: "Un iscritto ha parlato della scuola a diverse persone interessate.", tone: "positive", kind: "positive", minMembers: 1, contactDelta: 3 },
  { id: "extra-donation", title: "Contributo straordinario", description: "Una piccola donazione sostiene le prossime attività della scuola.", tone: "positive", kind: "positive", minMembers: 3, euroDelta: 20 },
  { id: "friends-at-training", title: "Davvero hai degli amici?", description: "Un nostro iscritto ci ha dato i contatti di alcuni suoi amici per una prova", tone: "positive", kind: "positive", minMembers: 5, contactDelta: 3 },
  MISSED_RENEWAL_EVENT,
  { id: "unexpected-repair", title: "Un piccolo disastro", description: "Non so cosa sia successo, non sono stato io!", tone: "neutral", kind: "negative", minMembers: 2, wearDelta: 15, damagedSwordsDelta: 1 },
  { id: "calendar-confusion", title: "Spada caduta: Fanne 5", description: "Capita a tutti prima o poi...", tone: "neutral", kind: "negative", minMembers: 4, wearDelta: 5 },
  { id: "black-sword-request", title: "Si può avere nera?", description: "Certe domande dovrebbero non essere mai fatte.", tone: "neutral", kind: "negative", minMembers: 4, wearDelta: 15 },
  { id: "spreadsheet-fan-club", title: "Il foglio di calcolo ha un fan club", description: "Un report condiviso per errore ha generato un numero sorprendente di richieste.", tone: "positive", kind: "absurd", minMembers: 8, contactDelta: 5 },
  { id: "too-many-volunteers", title: "Più volontari che partecipanti", description: "L'evento organizzativo ha prodotto soprattutto persone desiderose di aiutare.", tone: "positive", kind: "absurd", minMembers: 12, contactDelta: 8 },
  { id: "perfect-rack", title: "Il portaspade di legno perfetto", description: "Direttamente dall'Ordine del Vento di Trieste, è stupendo!", tone: "positive", kind: "absurd", minMembers: 6, wearDelta: -20 },
  { id: "new-sabersmith", title: "Un nuovo Sabersmith all’orizzonte?", description: "Sembra proprio che uno dei nostri sappia saldare...", tone: "positive", kind: "positive", minMembers: 6, wearDelta: -30, repairedSwordsDelta: 1 },
  { id: "pini-at-work", title: "Un Pini al lavoro", description: "Darth Modificus alla riscossa!", tone: "positive", kind: "absurd", minMembers: 6, wearDelta: -30 },
];
