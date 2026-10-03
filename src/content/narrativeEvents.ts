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
  { id: "word-of-mouth", title: "Passaparola inatteso", description: "Un iscritto ha parlato della scuola a diverse persone interessate alla fermata del Bus.", tone: "positive", kind: "positive", minMembers: 1, contactDelta: 2 },
  { id: "extra-donation", title: "Contributo straordinario", description: "Una donazione anonima da parte di uno sconosciuto che ci vede in difficoltà. È un programmatore e sta creando un gioco clicker sulla sua scuola di scherma", tone: "positive", kind: "positive", minMembers: 3, euroDelta: 1000 },
  { id: "friends-at-training", title: "Davvero hai degli amici?", description: "Un nostro iscritto ci ha dato i contatti di alcuni suoi amici per una prova", tone: "positive", kind: "positive", minMembers: 5, contactDelta: 3 },
  MISSED_RENEWAL_EVENT,
  { id: "unexpected-repair", title: "Un piccolo disastro", description: "Non so cosa sia successo, non sono stato io!", tone: "neutral", kind: "negative", minMembers: 2, wearDelta: 30, damagedSwordsDelta: 1 },
  { id: "calendar-confusion", title: "Spada caduta: Fanne 5", description: "Capita a tutti prima o poi...", tone: "neutral", kind: "negative", minMembers: 4, wearDelta: 10 },
  { id: "black-sword-request", title: "Si può avere nera?", description: "Certe domande dovrebbero non essere mai fatte...", tone: "neutral", kind: "negative", minMembers: 4, wearDelta: 30 },
  { id: "spreadsheet-fan-club", title: "I fogli di calcolo INCOM hanno i giorni contati", description: "A.N.D.E.R. ha scoperto i database e ora sta trovando nuovi contatti incrociando i dati con l'Agenzia delle Entrate", tone: "positive", kind: "absurd", minMembers: 15, contactDelta: 5 },
  { id: "too-many-volunteers", title: "Piedozzi ha fatto scalpore", description: "Siamo finiti sul giornale con una foto di Piedozzi e ora tutti vogliono provare LudoSport!", tone: "positive", kind: "absurd", minMembers: 30, contactDelta: 10 },
  { id: "perfect-rack", title: "Il portaspade di legno perfetto", description: "Direttamente dall'Ordine del Vento di Trieste, è stupendo!", tone: "positive", kind: "absurd", minMembers: 6, wearDelta: -20 },
  { id: "new-sabersmith", title: "Un nuovo Sabersmith all’orizzonte?", description: "Sembra proprio che uno dei nostri sappia saldare...", tone: "positive", kind: "positive", minMembers: 6, wearDelta: -30, repairedSwordsDelta: 1 },
  { id: "pini-at-work", title: "Un Pini al lavoro", description: "Darth Modificus alla riscossa!", tone: "positive", kind: "absurd", minMembers: 6, wearDelta: -30 },
];
