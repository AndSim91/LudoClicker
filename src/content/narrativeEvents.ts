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
  { id: "friends-at-training", title: "Amici alla prossima prova", description: "Un collaboratore ha portato nuovi nomi alla segreteria.", tone: "positive", kind: "positive", minMembers: 5, contactDelta: 2 },
  MISSED_RENEWAL_EVENT,
  { id: "unexpected-repair", title: "Riparazione non programmata", description: "Una spada ha subito un danno e richiede ricambi prima del prossimo evento.", tone: "neutral", kind: "negative", minMembers: 2, wearDelta: 15, damagedSwordsDelta: 1 },
  { id: "calendar-confusion", title: "Due calendari, tre orari", description: "La confusione è stata risolta, ma l'attrezzatura ha viaggiato inutilmente.", tone: "neutral", kind: "negative", minMembers: 4, wearDelta: 5 },
  { id: "spreadsheet-fan-club", title: "Il foglio di calcolo ha un fan club", description: "Un report condiviso per errore ha generato un numero sorprendente di richieste.", tone: "positive", kind: "absurd", minMembers: 8, contactDelta: 5 },
  { id: "too-many-volunteers", title: "Più volontari che partecipanti", description: "L'evento organizzativo ha prodotto soprattutto persone desiderose di aiutare.", tone: "positive", kind: "absurd", minMembers: 12, contactDelta: 8 },
  { id: "perfect-rack", title: "Allineamento perfetto della rastrelliera", description: "Per ragioni non del tutto tecniche, l'usura percepita è diminuita.", tone: "positive", kind: "absurd", minMembers: 6, wearDelta: -20 },
];
