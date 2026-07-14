import type { NarrativeEventId } from "../game/types";

export interface NarrativeEventDefinition {
  id: NarrativeEventId;
  title: string;
  description: string;
  tone: "positive" | "neutral";
  kind: "positive" | "negative" | "absurd";
  minMembers: number;
  euroDelta?: number;
  memberDelta?: number;
  contactDelta?: number;
  wearDelta?: number;
}

export const NARRATIVE_EVENTS: NarrativeEventDefinition[] = [
  { id: "word-of-mouth", title: "Passaparola inatteso", description: "Un iscritto ha parlato della scuola a diverse persone interessate.", tone: "positive", kind: "positive", minMembers: 1, contactDelta: 3 },
  { id: "extra-donation", title: "Contributo straordinario", description: "Una piccola donazione sostiene le prossime attività della scuola.", tone: "positive", kind: "positive", minMembers: 3, euroDelta: 20 },
  { id: "friends-at-training", title: "Amici alla prossima prova", description: "Un collaboratore ha portato nuovi nomi alla segreteria.", tone: "positive", kind: "positive", minMembers: 5, contactDelta: 2 },
  { id: "missed-renewal", title: "Mancato rinnovo", description: "Un iscritto ha sospeso temporaneamente la partecipazione.", tone: "neutral", kind: "negative", minMembers: 2, memberDelta: -1 },
  { id: "unexpected-repair", title: "Riparazione non programmata", description: "Una spada richiede ricambi prima del prossimo evento.", tone: "neutral", kind: "negative", minMembers: 2, euroDelta: -10, wearDelta: 15 },
  { id: "calendar-confusion", title: "Due calendari, tre orari", description: "La confusione è stata risolta, ma l'attrezzatura ha viaggiato inutilmente.", tone: "neutral", kind: "negative", minMembers: 4, wearDelta: 5 },
  { id: "spreadsheet-fan-club", title: "Il foglio di calcolo ha un fan club", description: "Un report condiviso per errore ha generato un numero sorprendente di richieste.", tone: "positive", kind: "absurd", minMembers: 8, contactDelta: 5 },
  { id: "too-many-volunteers", title: "Più volontari che partecipanti", description: "L'evento organizzativo ha prodotto soprattutto persone desiderose di aiutare.", tone: "positive", kind: "absurd", minMembers: 12, contactDelta: 8 },
  { id: "perfect-rack", title: "Allineamento perfetto della rastrelliera", description: "Per ragioni non del tutto tecniche, l'usura percepita è diminuita.", tone: "positive", kind: "absurd", minMembers: 6, wearDelta: -20 },
];
