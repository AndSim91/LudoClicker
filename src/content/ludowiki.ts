import { FORM_DEFINITIONS } from "./forms";
import { PERSON_RARITIES } from "./rarities";
import {
  SECRET_LEGENDARIES,
  SECRET_LEGENDARY_IDS,
  type SecretLegendaryId,
} from "./secretLegendaries";
import { SPECIAL_COLLABORATORS } from "./specialCollaborators";
import { getTournamentSchool } from "./tournamentSchools";
import { TOURNAMENT_DEFINITIONS } from "./tournaments";
import { GAME_CONFIG } from "../game/config";
import type { SpecialCollaboratorId } from "../game/types";

export interface LudodexLegendary {
  id: SpecialCollaboratorId;
  firstName: string;
  lastName: string;
  kind: "standard" | "secret";
  secretLegendaryId?: SecretLegendaryId;
  initialSchool: string;
  foundAt: string;
  acquisition: string;
}

const STANDARD_LUDODEX_LEGENDARIES: LudodexLegendary[] = SPECIAL_COLLABORATORS.map(
  (profile) => ({
    ...profile,
    kind: "standard",
    foundAt: profile.id === "andrea-simonazzi"
      ? "9° contatto della scuola iniziale"
      : "Nuovi contatti, dopo lo sblocco delle rarità avanzate",
    acquisition: "Invia l'email, completa la prova in palestra e ottieni l'iscrizione.",
  }),
);

function getSecretLegendaryDiscovery(id: SecretLegendaryId): Pick<
  LudodexLegendary,
  "initialSchool" | "foundAt" | "acquisition"
> {
  const profile = SECRET_LEGENDARIES[id];
  if (!profile.schoolId) {
    return {
      initialSchool: "Chronicles of Ludosport",
      foundAt: "Chronicles of Ludosport",
      acquisition: "Vinci una disciplina nelle Chronicles, poi supera la sfida Leggendaria al meglio delle tre.",
    };
  }

  const school = getTournamentSchool(profile.schoolId);
  const initialSchool = "academy" in school && school.academy !== school.name
    ? `${school.name} · ${school.academy}`
    : school.name;
  return {
    initialSchool,
    foundAt: TOURNAMENT_DEFINITIONS[school.level].label,
    acquisition: "Batti il Leggendario nella sua disciplina per sbloccare una prova in palestra. Completala con successo per ottenere l'iscrizione.",
  };
}

const SECRET_LUDODEX_LEGENDARIES: LudodexLegendary[] = SECRET_LEGENDARY_IDS
  .filter((id) => {
    const profile = SECRET_LEGENDARIES[id];
    return !("recruitment" in profile) || profile.recruitment !== "never";
  })
  .map((id) => ({
    id,
    firstName: SECRET_LEGENDARIES[id].firstName,
    lastName: SECRET_LEGENDARIES[id].lastName,
    kind: "secret",
    secretLegendaryId: id,
    ...getSecretLegendaryDiscovery(id),
  }));

/**
 * Il Ludodex contiene solo profili che possono realmente iscriversi. I
 * Leggendari esterni non reclutabili restano avversari e non rendono il 100%
 * della collezione impossibile da raggiungere.
 */
export const LUDODEX_LEGENDARIES: readonly LudodexLegendary[] = [
  ...STANDARD_LUDODEX_LEGENDARIES,
  ...SECRET_LUDODEX_LEGENDARIES,
];

export type LudoWikiChapterGroup =
  | "Primi passi"
  | "Gestione della scuola"
  | "Crescita"
  | "Competizioni";

export type LudoWikiVisualIcon =
  | "contact"
  | "mail"
  | "send"
  | "clock"
  | "flag"
  | "wrench"
  | "people"
  | "coin"
  | "spark"
  | "trophy"
  | "gift"
  | "trend"
  | "book";

export interface LudoWikiStep {
  icon: LudoWikiVisualIcon;
  label: string;
  detail: string;
}

export interface LudoWikiNumber {
  label: string;
  value: string;
  detail: string;
}

export interface LudoWikiChapter {
  id: string;
  group: LudoWikiChapterGroup;
  title: string;
  summary: string;
  introduction: string;
  steps: readonly LudoWikiStep[];
  numbers: readonly LudoWikiNumber[];
  rules: readonly string[];
  example?: {
    title: string;
    lines: readonly string[];
  };
  note?: string;
  related: readonly string[];
}

const percentage = (value: number) => `${(value * 100).toLocaleString("it-IT", {
  maximumFractionDigits: 1,
})}%`;

const seconds = (milliseconds: number) => `${milliseconds / 1_000} s`;

const rarityNumbers = Object.values(PERSON_RARITIES).map((rarity) => ({
  label: rarity.label,
  value: `${percentage(rarity.queueAppearanceChance)} in coda`,
  detail: `${percentage(rarity.baseTrialBookingChance)} prova · ${percentage(rarity.baseEnrollmentChance)} iscrizione base`,
}));

export const LUDOWIKI_CHAPTER_GROUPS: readonly LudoWikiChapterGroup[] = [
  "Primi passi",
  "Gestione della scuola",
  "Crescita",
  "Competizioni",
];

export const LUDOWIKI_CHAPTERS: readonly LudoWikiChapter[] = [
  {
    id: "email-contatti",
    group: "Primi passi",
    title: "Email e contatti",
    summary: "Come un contatto entra nella coda e riceve una campagna.",
    introduction: "Le email sono il primo passaggio del ciclo di reclutamento. Scrittura manuale e Collaboratori alimentano la stessa bozza: quando è completa, l'invio e la risposta procedono automaticamente.",
    steps: [
      { icon: "contact", label: "Contatto", detail: "Entra nella coda" },
      { icon: "mail", label: "Bozza", detail: "Completa i caratteri" },
      { icon: "send", label: "Invio", detail: "Parte in automatico" },
      { icon: "clock", label: "Risposta", detail: "Esito registrato" },
    ],
    numbers: [
      { label: "Risposta", value: seconds(GAME_CONFIG.emailOutcomeMinMs), detail: "tempo attuale dopo l'invio" },
      { label: "Attesa prova", value: seconds(GAME_CONFIG.trialWaitMinMs), detail: "dalla risposta all'appuntamento" },
      { label: "Archivio recente", value: `${GAME_CONFIG.recentEmailsLimit}`, detail: "email conservate prima del riepilogo" },
    ],
    rules: [
      "La scrittura automatica e quella manuale completano la stessa campagna.",
      "Una risposta positiva prenota una prova; una negativa chiude il contatto.",
      "La rarità modifica la probabilità di ottenere la prova.",
    ],
    related: ["prove-iscrizioni", "rarita-leggendari", "collaboratori-settori"],
  },
  {
    id: "eventi-attrezzatura",
    group: "Primi passi",
    title: "Eventi e attrezzatura",
    summary: "Contatti, capacità della squadra e consumo delle spade.",
    introduction: "Gli Eventi trasformano il lavoro della scuola in persone incontrate e nuovi contatti. Quasi tutte le attività usano attrezzatura: il carico accumulato può rompere le spade e ridurre la capacità operativa.",
    steps: [
      { icon: "flag", label: "Evento", detail: "Scegli un'attività" },
      { icon: "people", label: "Squadra", detail: "Assegna capacità" },
      { icon: "wrench", label: "Usura", detail: "Accumula carico" },
      { icon: "contact", label: "Contatti", detail: "Registra gli esiti" },
    ],
    numbers: [
      { label: "Dotazione iniziale", value: `${GAME_CONFIG.initialSwords} spade`, detail: "disponibili nella prima scuola" },
      { label: "Rottura", value: `${GAME_CONFIG.equipmentBreakLoad} carico`, detail: "equivale a una spada rotta" },
      { label: "Riparazione", value: `€ ${GAME_CONFIG.equipmentDamagedSwordRepairCost}`, detail: "per ogni spada già rotta" },
    ],
    rules: [
      "Se l'attrezzatura richiesta non è disponibile, l'attività non può partire.",
      "La manutenzione preventiva converte lavoro e denaro in carico rimosso.",
      "Upgrade e Collaboratori possono ridurre il consumo o automatizzare le riparazioni.",
    ],
    related: ["collaboratori-settori", "upgrade", "gadget"],
  },
  {
    id: "prove-iscrizioni",
    group: "Primi passi",
    title: "Prove e iscrizioni",
    summary: "Dal primo appuntamento alla quota mensile dell'iscritto.",
    introduction: "Una prova risolve il tentativo di iscrizione. La probabilità dipende dalla rarità e dai progressi della scuola; garanzie e casi speciali possono intervenire senza cambiare il flusso visibile.",
    steps: [
      { icon: "contact", label: "Contatto", detail: "Mostra interesse" },
      { icon: "mail", label: "Email", detail: "Prenota la prova" },
      { icon: "clock", label: "Prova", detail: "Attendi l'esito" },
      { icon: "people", label: "Iscrizione", detail: "Entra nella scuola" },
    ],
    numbers: [
      { label: "Durata prova", value: seconds(GAME_CONFIG.trialDurationMs), detail: "durata base visibile" },
      { label: "Bonus immediato", value: `€ ${GAME_CONFIG.enrollmentBonus}`, detail: "accreditato all'iscrizione" },
      { label: "Quota mensile", value: `€ ${GAME_CONFIG.monthlyMemberFee} + € ${GAME_CONFIG.monthlyMemberFormBonus}`, detail: "base più ogni Forma o corso" },
    ],
    rules: [
      "Il risultato non è sempre garantito, anche dopo una prova prenotata.",
      "Un'iscrizione Leggendaria rende subito disponibile anche il Collaboratore.",
      "Il bonus di iscrizione è separato dalla quota ricorrente mensile.",
      `Per ogni Forma o corso, un attestato da Istruttore aggiunge € ${GAME_CONFIG.monthlyMemberInstructorBonus}; una qualifica da Tecnico porta il bonus a € ${GAME_CONFIG.monthlyMemberTechnicianBonus} e sostituisce quello da Istruttore.`,
    ],
    example: {
      title: "Esempio: iscritto con 2 Forme",
      lines: [
        `€ ${GAME_CONFIG.monthlyMemberFee} + (2 × € ${GAME_CONFIG.monthlyMemberFormBonus}) = € ${GAME_CONFIG.monthlyMemberFee + 2 * GAME_CONFIG.monthlyMemberFormBonus} al mese`,
        `All'iscrizione ricevi inoltre € ${GAME_CONFIG.enrollmentBonus} una tantum.`,
      ],
    },
    note: "Le protezioni dalla sfortuna e le eccezioni narrative restano intenzionalmente non dettagliate: fanno parte del comportamento del gioco, non di una statistica da ottimizzare.",
    related: ["email-contatti", "rarita-leggendari", "economia-scuola"],
  },
  {
    id: "rarita-leggendari",
    group: "Primi passi",
    title: "Rarità e Leggendari",
    summary: "Frequenza, prove, iscrizioni e accesso ai Collaboratori.",
    introduction: "La rarità descrive quanto spesso una persona compare e come affronta il reclutamento. I Leggendari hanno nome e cognome fissi, sono unici e vengono registrati permanentemente nel Ludodex dopo la prima iscrizione.",
    steps: [
      { icon: "contact", label: "Comune", detail: "Frequente" },
      { icon: "trend", label: "Raro", detail: "Più selettivo" },
      { icon: "spark", label: "Ultra Raro", detail: "Corso Y per collaborare" },
      { icon: "book", label: "Leggendario", detail: "Unico e permanente" },
    ],
    numbers: rarityNumbers,
    rules: [
      "Le percentuali di coda indicano la distribuzione base dei nuovi contatti.",
      "I Leggendari diventano Collaboratori appena si iscrivono.",
      "Un Leggendario già iscritto resta nel Ludodex anche se lascia la scuola o ne fondi una nuova.",
    ],
    related: ["prove-iscrizioni", "collaboratori-settori", "tornei"],
  },
  {
    id: "economia-scuola",
    group: "Gestione della scuola",
    title: "Economia della scuola",
    summary: "Entrate una tantum, rette, spese e ritmo dei mesi.",
    introduction: "Gli Euro finanziano Forme, attrezzatura, Upgrade e attività. Le iscrizioni danno un bonus immediato; le rette arrivano invece al cambio mese e crescono con la formazione degli iscritti.",
    steps: [
      { icon: "people", label: "Iscritti", detail: "Generano rette" },
      { icon: "coin", label: "Entrate", detail: "Finanziano la scuola" },
      { icon: "spark", label: "Investimenti", detail: "Sbloccano crescita" },
      { icon: "trend", label: "Ritorno", detail: "Aumenta la capacità" },
    ],
    numbers: [
      { label: "Mese di gioco", value: seconds(GAME_CONFIG.gameMonthMs), detail: "tempo attivo di base" },
      { label: "Quota base", value: `€ ${GAME_CONFIG.monthlyMemberFee}`, detail: "per iscritto attivo" },
      { label: "Bonus formazione", value: `+ € ${GAME_CONFIG.monthlyMemberFormBonus}`, detail: "per ogni Forma o corso" },
      { label: "Bonus Istruttore", value: `+ € ${GAME_CONFIG.monthlyMemberInstructorBonus}`, detail: "per ogni attestato" },
      { label: "Bonus Tecnico", value: `+ € ${GAME_CONFIG.monthlyMemberTechnicianBonus}`, detail: "al posto del bonus Istruttore" },
    ],
    rules: [
      "Le rette considerano soltanto gli iscritti attivi.",
      "La formazione aumenta le entrate ma richiede tempo, denaro e attrezzatura.",
      "Follower e scuole fondate aggiungono altre entrate ricorrenti quando i sistemi sono sbloccati.",
    ],
    related: ["forme-corsi", "social", "rete-scuole"],
  },
  {
    id: "upgrade",
    group: "Gestione della scuola",
    title: "Upgrade",
    summary: "Rami pubblici, livelli, prerequisiti e automazioni.",
    introduction: "Gli Upgrade trasformano risorse in vantaggi permanenti per la scuola corrente. Ogni ramo sviluppa un sistema preciso: leggere prerequisiti ed effetto evita acquisti che non aiutano l'obiettivo immediato.",
    steps: [
      { icon: "coin", label: "Costo", detail: "Verifica gli Euro" },
      { icon: "book", label: "Requisito", detail: "Completa il nodo prima" },
      { icon: "spark", label: "Acquisto", detail: "Sblocca l'effetto" },
      { icon: "trend", label: "Sinergia", detail: "Combina i rami" },
    ],
    numbers: [
      { label: "Rami pubblici", value: "8", detail: "Scrittura, Creatività, Carisma, Accoglienza, Attrezzatura, Gadget, Insegnamento e Organizzazione" },
      { label: "Livelli per ramo", value: "7", detail: "con costi e requisiti crescenti" },
      { label: "Sblocco iniziale", value: "1 iscritto", detail: "insieme alla pagina della scuola" },
    ],
    rules: [
      "Un valore mostrato nel nodo sostituisce quello del livello precedente quando è presentato come valore finale.",
      "Gli effetti di rami diversi possono cooperare sullo stesso sistema.",
      "I percorsi segreti compaiono soltanto dopo la loro scoperta nel gioco.",
    ],
    related: ["economia-scuola", "collaboratori-settori", "gadget"],
  },
  {
    id: "collaboratori-settori",
    group: "Gestione della scuola",
    title: "Collaboratori e settori",
    summary: "Assegnazioni, produttività, maestria e priorità operative.",
    introduction: "I Collaboratori automatizzano il lavoro della scuola. Un incarico attivo produce nel relativo settore; la Maestria cresce con il tempo realmente lavorato e rende più efficace quella specializzazione.",
    steps: [
      { icon: "people", label: "Recluta", detail: "Ottieni un profilo idoneo" },
      { icon: "flag", label: "Assegna", detail: "Scegli un settore" },
      { icon: "clock", label: "Lavora", detail: "Accumula tempo attivo" },
      { icon: "trend", label: "Maestria", detail: "Aumenta l'efficacia" },
    ],
    numbers: [
      { label: "Leggendario", value: "×2", detail: "moltiplicatore base di produttività" },
      { label: "Ultra Raro", value: "×1", detail: "diventa Collaboratore dopo il Corso Y" },
      { label: "Vista aggregata", value: `${GAME_CONFIG.collaboratorAggregateUnlockCount}`, detail: "Collaboratori per gestire posti e priorità" },
    ],
    rules: [
      "Ogni Collaboratore può avere un incarico operativo principale.",
      "I posti aggregati distribuiscono automaticamente le persone rispettando le priorità.",
      "I Leggendari conservano progressi e Maestria anche tra scuole diverse.",
    ],
    related: ["forme-corsi", "social", "eventi-attrezzatura"],
  },
  {
    id: "forme-corsi",
    group: "Crescita",
    title: "Forme e corsi",
    summary: "Percorso tecnico, rami d'arma e Preparazione nei tornei.",
    introduction: "La formazione aumenta il valore dell'iscritto e apre ruoli avanzati. Le Forme numeriche migliorano la Preparazione usata nei tornei; i corsi intermedi sbloccano invece capacità operative specifiche.",
    steps: [
      { icon: "book", label: "Forma 1", detail: "Inizia il percorso" },
      { icon: "spark", label: "Corsi X e Y", detail: "Aprono nuovi ruoli" },
      { icon: "flag", label: "Ramo d'arma", detail: "Scegli la specialità" },
      { icon: "trophy", label: "Forme 6 e 7", detail: "Completa il percorso" },
    ],
    numbers: [
      { label: "Percorsi disponibili", value: `${FORM_DEFINITIONS.length}`, detail: "Forme e corsi nel catalogo" },
      { label: "Bonus per Forma", value: "+10%", detail: "sulla Preparazione Arena e Stile" },
      { label: "Esperienza torneo", value: "+3%", detail: "per punto, fino a 20" },
    ],
    rules: [
      "Dalla Forma 3 il percorso si divide in Spada Lunga, Staffa e Doppie Spade Corte.",
      "La Preparazione combina valore base, Forme numeriche ed esperienza nei tornei.",
      "Costi, durata e spade richieste sono mostrati prima di avviare ogni formazione.",
    ],
    related: ["tornei", "collaboratori-settori", "economia-scuola"],
  },
  {
    id: "social",
    group: "Crescita",
    title: "Social",
    summary: "Contenuti, Follower, nuovi contatti e sponsorizzazioni.",
    introduction: "Quando la scuola cresce, la Redazione diventa Social. Il lavoro continua a sostenere le email e in parallelo produce contenuti che possono generare Follower, contatti ed entrate ricorrenti.",
    steps: [
      { icon: "people", label: "Collaboratori", detail: "Producono lavoro" },
      { icon: "mail", label: "Email", detail: "Riceve la quota principale" },
      { icon: "spark", label: "Contenuti", detail: "Completano un ciclo" },
      { icon: "trend", label: "Follower", detail: "Fama e rendita" },
    ],
    numbers: [
      { label: "Sblocco", value: `${GAME_CONFIG.socialUnlockMembers} iscritti`, detail: "attivi nella scuola" },
      { label: "Ripartizione base", value: "95% / 5%", detail: "email e contenuti mentre si scrive" },
      { label: "Ciclo contenuto", value: `${GAME_CONFIG.socialBaseContentCharacters.toLocaleString("it-IT")} caratteri`, detail: "requisito base" },
    ],
    rules: [
      "Ogni Follower aumenta anche la Fama della scuola.",
      "I Follower migliorano l'affluenza agli Eventi e alimentano le sponsorizzazioni.",
      "Senza Collaboratori assegnati ai Social, l'automazione del settore non avanza.",
    ],
    related: ["eventi-attrezzatura", "collaboratori-settori", "economia-scuola"],
  },
  {
    id: "tornei",
    group: "Competizioni",
    title: "Tornei",
    summary: "Qualificazioni, Preparazione, circuiti e premi stagionali.",
    introduction: "I tornei confrontano la Preparazione Arena e Stile degli atleti. Forme, valori base ed esperienza determinano le prestazioni; ogni circuito alza lo standard medio del campo.",
    steps: [
      { icon: "people", label: "Atleti", detail: "Scegli gli iscritti" },
      { icon: "trend", label: "Preparazione", detail: "Arena e Stile" },
      { icon: "trophy", label: "Classifica", detail: "Due discipline" },
      { icon: "gift", label: "Premi", detail: "Miglior piazzamento" },
    ],
    numbers: [
      { label: "Sblocco", value: `${GAME_CONFIG.tournamentUnlockMembers} Fama`, detail: "accesso iniziale alla pagina" },
      { label: "Accademico", value: `${TOURNAMENT_DEFINITIONS.academy.standard}`, detail: "standard medio del circuito" },
      { label: "Nazionale / Champion's", value: `${TOURNAMENT_DEFINITIONS.national.standard} / ${TOURNAMENT_DEFINITIONS.champions.standard}`, detail: "standard medi successivi" },
    ],
    rules: [
      "Arena e Stile producono classifiche e premi distinti.",
      "Le ricompense non si sommano più volte nella stessa disciplina: vale il miglior risultato utile.",
      "I Leggendari Segreti incontrati nei tornei seguono regole di disponibilità e reclutamento proprie.",
    ],
    related: ["forme-corsi", "rarita-leggendari", "gadget"],
  },
  {
    id: "gadget",
    group: "Competizioni",
    title: "Gadget",
    summary: "Dal progetto alla qualità, fino alle vendite automatiche.",
    introduction: "Il Laboratorio Gadget converte Produttività in prodotti vendibili. Ogni articolo deve essere acquistato, sviluppato e sottoposto a una prova qualità prima di entrare nel catalogo.",
    steps: [
      { icon: "coin", label: "Progetto", detail: "Acquista il prodotto" },
      { icon: "wrench", label: "Sviluppo", detail: "Consuma Produttività" },
      { icon: "spark", label: "Qualità", detail: "Completa la prova" },
      { icon: "gift", label: "Vendite", detail: "Partono in automatico" },
    ],
    numbers: [
      { label: "Sblocco", value: "1ª vittoria Accademica", detail: "apre il Laboratorio" },
      { label: "Qualità minima utile", value: "> 50%", detail: "può sbloccare una nuova rarità" },
      { label: "Guadagno massimo squadra", value: `€ ${GAME_CONFIG.reptileMaximumGadgetGrossPerTeam.toLocaleString("it-IT")}`, detail: "limite per squadra nel Reptile" },
    ],
    rules: [
      "Senza Collaboratori nel settore, progetti e revisioni non avanzano.",
      "Una qualità migliore aumenta probabilità di vendita e guadagno unitario.",
      "Il Pubblico raggiungibile dipende dagli iscritti e, con gli Upgrade, dai Follower.",
    ],
    related: ["collaboratori-settori", "social", "tornei"],
  },
  {
    id: "rete-scuole",
    group: "Crescita",
    title: "Rete e nuove scuole",
    summary: "Prestigio, requisiti di fondazione e progressi permanenti.",
    introduction: "Fondare una nuova scuola riavvia il ciclo locale ma amplia la Rete. È una scelta di lungo periodo: alcuni progressi ripartono, mentre reputazione e traguardi permanenti continuano ad accompagnarti.",
    steps: [
      { icon: "trend", label: "Requisiti", detail: "Completa il ciclo" },
      { icon: "trophy", label: "Champion's", detail: "Ottieni la vittoria" },
      { icon: "people", label: "Fondazione", detail: "Apri una scuola" },
      { icon: "book", label: "Rete", detail: "Conserva i progressi" },
    ],
    numbers: [
      { label: "Fama iniziale", value: `${GAME_CONFIG.prestigeFame}`, detail: "moltiplicata per il ciclo" },
      { label: "Collaboratori", value: `${GAME_CONFIG.prestigeCollaborators}`, detail: "+2 per ogni ciclo successivo" },
      { label: "Eventi", value: `${GAME_CONFIG.prestigeEvents}`, detail: "moltiplicati per il ciclo" },
    ],
    rules: [
      "Serve una vittoria nella Champion's Arena della scuola corrente.",
      "Ogni scuola fondata aumenta i requisiti del ciclo seguente.",
      "Il Ludodex e i progressi permanenti dei Leggendari non vengono cancellati.",
    ],
    related: ["economia-scuola", "tornei", "rarita-leggendari"],
  },
];
