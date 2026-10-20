import type { NarrativeEventId, SpecialCollaboratorId } from "../game/types";

export interface NarrativeEventDefinition {
  id: NarrativeEventId;
  title: string;
  description: string;
  tone: "positive" | "neutral";
  kind: "positive" | "negative" | "absurd";
  minMembers: number;
  /** Only raised by the game itself (renewals, tournament defeats), never by the random roll. */
  scripted?: boolean;
  /**
   * Andrea 20/10: entra nel sorteggio solo se tutti questi Leggendari sono
   * iscritti alla scuola attuale (si azzera alla fondazione).
   */
  requiredLegendaries?: readonly SpecialCollaboratorId[];
  euroDelta?: number;
  contactDelta?: number;
  /**
   * Andrea 20/10: usura in percentuale della capacità totale delle spade
   * (spade × 100), non più in punti fissi, così pesa anche nel lategame.
   * Valori convertiti dai vecchi punti sulle 6 spade iniziali (30 pt = 5%).
   */
  wearPercent?: number;
  /** «Un aiuto da Alpha»: questi euro per ogni scuola della carriera (attuale compresa), senza moltiplicatori. */
  eurosPerSchool?: number;
  /** Tutti i corsi in corso avanzano di questa percentuale; chi la supera finisce senza esame. */
  courseBoostPercent?: number;
  /** «Il Mediatore»: il prossimo giugno nessuno se ne va; mai due anni scolastici di fila. */
  departureShield?: boolean;
  /**
   * «Un procione in palestra»: tutti gli effetti raddoppiano a ogni comparsa,
   * per tutto il salvataggio (anche nelle scuole successive).
   */
  doublesEveryTime?: boolean;
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
  scripted: true,
} satisfies NarrativeEventDefinition;

/**
 * Leggendari Segreti non reclutabili (Andrea, 08/10): nessuna scena, solo un
 * Evento in La mia giornata a ogni sconfitta. La cifra è quella del profilo.
 */
export const SECRET_DEFEAT_EVENTS = {
  "adriano-panico": {
    id: "rancor-den",
    title: "La tana del Rancor",
    description: "Hai sconfitto Adriano Panico in torneo e la scuola ha ricevuto una donazione.",
    tone: "positive",
    kind: "positive",
    minMembers: 0,
    scripted: true,
  },
  "daniele-maggi": {
    id: "thirty-milanese-coins",
    title: "Trenta denari milanesi",
    description: "Hai sconfitto Daniele Maggi in torneo e la scuola ha ricevuto una donazione.",
    tone: "positive",
    kind: "positive",
    minMembers: 0,
    scripted: true,
  },
} satisfies Record<string, NarrativeEventDefinition>;

export const NARRATIVE_EVENTS: NarrativeEventDefinition[] = [
  { id: "word-of-mouth", title: "Passaparola inatteso", description: "Un iscritto ha parlato della scuola a diverse persone interessate alla fermata del Bus.", tone: "positive", kind: "positive", minMembers: 1, contactDelta: 5 },
  { id: "extra-donation", title: "Contributo straordinario", description: "Una donazione anonima da parte di uno sconosciuto che ci vede in difficoltà. È un programmatore e sta creando un gioco clicker sulla sua scuola di scherma", tone: "positive", kind: "positive", minMembers: 3, euroDelta: 1000 },
  { id: "friends-at-training", title: "Davvero hai degli amici?", description: "Un nostro iscritto ci ha dato i contatti di alcuni suoi amici per una prova", tone: "positive", kind: "positive", minMembers: 5, contactDelta: 5 },
  MISSED_RENEWAL_EVENT,
  { id: "unexpected-repair", title: "Un piccolo disastro", description: "Non so cosa sia successo, non sono stato io!", tone: "neutral", kind: "negative", minMembers: 2, wearPercent: 5, damagedSwordsDelta: 1 },
  { id: "calendar-confusion", title: "Spada caduta: Fanne 5", description: "Capita a tutti prima o poi...", tone: "neutral", kind: "negative", minMembers: 4, wearPercent: 2 },
  { id: "black-sword-request", title: "Si può avere nera?", description: "Certe domande dovrebbero non essere mai fatte...", tone: "neutral", kind: "negative", minMembers: 4, wearPercent: 5 },
  { id: "spreadsheet-fan-club", title: "I fogli di calcolo INCOM hanno i giorni contati", description: "A.N.D.E.R. ha scoperto i database e ora sta trovando nuovi contatti incrociando i dati con l'Agenzia delle Entrate", tone: "positive", kind: "absurd", minMembers: 15, contactDelta: 5 },
  { id: "too-many-volunteers", title: "Piedozzi ha fatto scalpore", description: "Siamo finiti sul giornale con una foto di Piedozzi e ora tutti vogliono provare LudoSport!", tone: "positive", kind: "absurd", minMembers: 30, requiredLegendaries: ["marco-gabriele-fedozzi"], contactDelta: 20 },
  { id: "perfect-rack", title: "Il portaspade di legno perfetto", description: "Direttamente dall'Ordine del Vento di Trieste, è stupendo!", tone: "positive", kind: "absurd", minMembers: 6, requiredLegendaries: ["andrea-ferrari"], wearPercent: -3 },
  { id: "new-sabersmith", title: "Un nuovo Sabersmith all’orizzonte?", description: "Sembra proprio che uno dei nostri sappia saldare...", tone: "positive", kind: "positive", minMembers: 6, wearPercent: -5, repairedSwordsDelta: 1 },
  SECRET_DEFEAT_EVENTS["adriano-panico"],
  SECRET_DEFEAT_EVENTS["daniele-maggi"],
  { id: "pini-at-work", title: "Un Pini al lavoro", description: "Darth Modificus alla riscossa!", tone: "positive", kind: "absurd", minMembers: 6, requiredLegendaries: ["ruggero-pini"], wearPercent: -5 },
  // Eventi dei Leggendari (Andrea, 20/10/2026). Testi: bozze da rivedere con Andrea.
  { id: "alpha-help", title: "Un aiuto da Alpha", description: "Lorenzo Todaro ha chiamato a Milano. Dall'altra parte qualcuno ha detto «quanto vi serve?» e nessuno ha avuto il coraggio di rispondere «tutto».", tone: "positive", kind: "positive", minMembers: 0, requiredLegendaries: ["lorenzo-todaro"], eurosPerSchool: 100_000 },
  { id: "the-mediator", title: "Il Mediatore", description: "Matteo Scarzello ha parlato con tutti quelli che volevano mollare. Nessuno ricorda bene cosa abbia detto, ma restano tutti.", tone: "positive", kind: "positive", minMembers: 0, requiredLegendaries: ["matteo-scarzello"], departureShield: true },
  { id: "perfect-photos", title: "Delle foto perfette", description: "Eva Parodi ha fotografato l'ultimo allenamento. Sembriamo tutti più bravi di quanto siamo, e la gente ci casca.", tone: "positive", kind: "positive", minMembers: 0, requiredLegendaries: ["eva-parodi"], contactDelta: 20 },
  { id: "hokage-technician", title: "Diventerò Tecnico (o Hokage)", description: "Chris Usai si allena con una determinazione che contagia la palestra. Tutti i corsi accelerano, nessuno ha il coraggio di chiedergli di fermarsi.", tone: "positive", kind: "positive", minMembers: 0, requiredLegendaries: ["chris-usai"], courseBoostPercent: 20 },
  { id: "derivative-pink", title: "La derivata è un'apostrofo rosa tra IH e OH", description: "Guglielmo Oliveri ha spiegato le Forme con la matematica. Nessuno ha capito la matematica, ma adesso le Forme vengono meglio.", tone: "positive", kind: "absurd", minMembers: 0, requiredLegendaries: ["guglielmo-oliveri"], courseBoostPercent: 20 },
  { id: "gym-raccoon", title: "Un procione in palestra", description: "Andrea Simonazzi giura di non averlo portato lui. Il procione, intanto, ha trovato un contatto, qualche spicciolo e ha sistemato una spada. Torna sempre, e ogni volta è più bravo.", tone: "positive", kind: "absurd", minMembers: 0, requiredLegendaries: ["andrea-simonazzi"], doublesEveryTime: true, contactDelta: 1, euroDelta: 10, wearPercent: -1, courseBoostPercent: 1 },
];
