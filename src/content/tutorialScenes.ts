import { GAME_CONFIG } from "../game/config";
import { hasPrestigeTitle, isGameAreaUnlocked } from "../game/progression";
import { isOfficialSwordSupplierUnlocked } from "./upgrades";
import { formatCurrency } from "../shared/formatters";
import { hasCompletedTutorialSparring } from "../game/tutorialProgress";
import type { GameState } from "../game/types";

export const TUTORIAL_REGION_IDS = [
  "title",
  "contacts-counter",
  "title-equipment",
  "commands",
  "navigation",
  "events-navigation",
  "contacts-navigation",
  "upgrades-navigation",
  "gadget-navigation",
  "folders",
  "messages",
  "main",
  "gadget-overview",
  "gadget-catalog",
  "composer-header",
  "composer-recipient",
  "composer-body",
  "park-sparring-event",
  "park-sparring-action",
  "day-panel",
  "first-trial-row",
  "collaborator-section",
  "collaborator-social-assignment",
  "collaborator-sectors",
  "tournaments-navigation",
  "network-navigation",
  "tournament-final",
  "tournament-groups",
  "tournament-podium",
  "reptile-hero",
  "reptile-month",
  "reptile-preparation",
  "reptile-minigame",
  "network-map",
  "network-ready",
  "network-upgrades",
  "network-keeps",
  "network-found",
  "status",
] as const;

export type TutorialRegionId = typeof TUTORIAL_REGION_IDS[number];

export const LEGACY_TUTORIAL_SCENE_IDS = [
  "first-invitation",
  "first-event",
  "first-trial",
  "first-legendary",
  "first-enrollment",
  "collaborator-sectors",
  "social-evolution",
] as const;

export const FIRST_COLLABORATOR_TUTORIAL_SCENE_ID = "first-collaborator" as const;
export const COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID = "collaborator-teaching" as const;
/** First yearly departures with no Istruttore assigned (06/10/2026). */
export const MEMBER_DEPARTURES_TUTORIAL_SCENE_ID = "member-departures" as const;
/** At 10 members: the swords menu and the purchase (06/10/2026). */
export const SWORD_PURCHASE_TUTORIAL_SCENE_ID = "sword-purchase" as const;
export const SWORD_PURCHASE_TUTORIAL_MEMBERS = 10;

/** Tutorials of the second half of the game (05/10/2026): the migration to v102 marks them done on saves already past them. */
export const LATE_TUTORIAL_SCENE_IDS = [
  "first-tournament",
  "network-introduction",
  "reptile-introduction",
] as const;

export const TUTORIAL_SCENE_IDS = [
  ...LEGACY_TUTORIAL_SCENE_IDS,
  FIRST_COLLABORATOR_TUTORIAL_SCENE_ID,
  COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID,
  MEMBER_DEPARTURES_TUTORIAL_SCENE_ID,
  SWORD_PURCHASE_TUTORIAL_SCENE_ID,
  "gadget-laboratory",
  ...LATE_TUTORIAL_SCENE_IDS,
] as const;

export type TutorialSceneId = typeof TUTORIAL_SCENE_IDS[number];

export interface TutorialRuntimeContext {
  state: GameState;
  activeView: string;
  /** The swords menu in the title bar is open. */
  equipmentOpen?: boolean;
}

type RegionSelection =
  | readonly TutorialRegionId[]
  | ((context: TutorialRuntimeContext) => readonly TutorialRegionId[]);

type TutorialBody =
  | readonly string[]
  | ((context: TutorialRuntimeContext) => readonly string[]);

interface TutorialStepBase {
  id: string;
  body: TutorialBody;
  focusRegions: RegionSelection;
  hiddenRegions?: RegionSelection;
  scrollToRegion?: TutorialRegionId;
  navigateTo?: string;
  /** Where the dialog card sits, so it does not cover the focused region (default: centre). */
  cardPlacement?: "left" | "right" | "below";
  /** Tornei opens on this tab while the step is shown. */
  tournamentTab?: "results" | "reptile";
  /** The swords menu in the title bar stays open while the step is shown. */
  opensEquipment?: boolean;
}

export interface TutorialDialogStep extends TutorialStepBase {
  kind: "dialog";
  speaker: string;
  title?: string;
}

export interface TutorialObjectiveStep extends TutorialStepBase {
  kind: "objective";
  title: string;
  isComplete: (context: TutorialRuntimeContext) => boolean;
}

export type TutorialStep = TutorialDialogStep | TutorialObjectiveStep;

export interface TutorialSceneDefinition {
  id: TutorialSceneId;
  pauseWhileActive?: boolean;
  canStart: (context: TutorialRuntimeContext) => boolean;
  steps: readonly TutorialStep[];
}

export function resolveTutorialRegions(
  selection: RegionSelection | undefined,
  context: TutorialRuntimeContext,
): readonly TutorialRegionId[] {
  if (!selection) return [];
  return typeof selection === "function" ? selection(context) : selection;
}

export function resolveTutorialBody(
  body: TutorialBody,
  context: TutorialRuntimeContext,
): readonly string[] {
  return typeof body === "function" ? body(context) : body;
}

export const TUTORIAL_SCENES: readonly TutorialSceneDefinition[] = [
  {
    id: "first-invitation",
    pauseWhileActive: true,
    canStart: ({ state }) => state.profile.displayName.trim().length > 0,
    steps: [
      {
        id: "empty-school",
        kind: "dialog",
        speaker: "",
        title: "Il primo giorno da Preside",
        body: ({ state }) => [
          `Ciao ${state.profile.displayName.trim()} e congratulazioni per aver accettato il posto da Preside dell'Ordine delle Onde!`,
          "Io sono A.N.D.E.R., il tuo assistente AI. Ti aiuterò a far crescere la tua prima scuola di LudoSport!",
        ],
        focusRegions: ["title"],
      },
      {
        id: "who-we-are",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Chi siamo",
        body: [
          "LudoSport è una realtà sportiva di Scherma con Spada Laser, nata a Milano nel 2006 e che in vent'anni ha aperto scuole in tutto il mondo! Attraverso la filosofia del Se.Cu.Ri. (Servizio, Cura e Rispetto), sono state create Tecniche, Regolamenti e Tornei di livello nazionale ed internazionale.",
          "Il nostro obiettivo qui è semplice: dobbiamo creare la scuola di LudoSport più grande del mondo!",
        ],
        focusRegions: ["title"],
      },
      {
        id: "draft-ready",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Un'email al giorno...",
        body: [
          "Ho già predisposto per te qualche contatto email a cui scrivere. Li ho trovati scrivendo lettere a caso per tutta la notte, dovresti ringraziarmi.",
          "Ora inizia il tuo lavoro: scrivi un'email da inviare ai nostri contatti, poi dovremo solo attendere una risposta...",
        ],
        focusRegions: ["main"],
      },
      {
        id: "write-first-email",
        kind: "objective",
        title: "Invia la tua prima mail",
        body: [
          "Premi un tasto qualsiasi fino a completare la bozza. Con Invio automatico attivo partirà subito; se lo disattivi, resterà in bozza finché non premi Invia. Non preoccuparti degli errori di battitura: siamo solo agli inizi.",
        ],
        focusRegions: ["main", "composer-body"],
        isComplete: ({ state }) => state.emails.some((email) => email.status === "sending"),
      },
    ],
  },
  {
    id: "first-event",
    canStart: ({ state }) => isGameAreaUnlocked("events", state),
    steps: [
      {
        id: "open-events",
        kind: "objective",
        title: "Apri la pagina Eventi",
        body: [
          "Adesso che hai inviato qualche email è il momento di procurarci nuovi contatti a cui scrivere!",
          "Apri la pagina [[Eventi]] dalla barra a sinistra.",
        ],
        focusRegions: ({ activeView }) =>
          activeView === "events"
            ? ["main"]
            : ["navigation", "events-navigation"],
        isComplete: ({ activeView }) => activeView === "events",
      },
      {
        id: "events-and-equipment",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Eventi e attrezzatura",
        body: [
          "Gli [[Eventi]] servono a far conoscere il nostro sport al mondo esterno: incontrerai persone, farai dimostrazioni e potrai scavarti una buca a terra fino a che non trovi persone interessate a provare il nostro sport.",
          "Attenzione: generalmente le attività richiedono un numero minimo di **Iscritti** e impegnano le **Spade** della scuola. L'attrezzatura può accumulare usura e potrebbe anche danneggiarsi: quando serve, dovrai eseguire la manutenzione prima di riutilizzarla!",
        ],
        focusRegions: ["main"],
      },
      {
        id: "start-free-sparring",
        kind: "objective",
        title: "Avvia il volantinaggio gratuito",
        body: [
          "Trova “Volantinaggio” e premi “Partecipa gratis”. Non servono **Spade** per questo: poi attendi il suo completamento.",
        ],
        focusRegions: ["main", "park-sparring-action"],
        isComplete: ({ state }) => hasCompletedTutorialSparring(state) ||
          state.acquisitionEvents.some((event) => event.tutorialSceneId === "first-event"),
      },
      {
        id: "wait-free-sparring",
        kind: "objective",
        title: "Attendi la fine del volantinaggio",
        body: [
          "Quante cose possiamo fare in cinque secondi? ...",
          "Scemo chi legge!",
        ],
        focusRegions: ["main", "park-sparring-event"],
        isComplete: ({ state }) => hasCompletedTutorialSparring(state),
      },
      {
        id: "contacts-increased",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Abbiamo dei contatti!",
        body: [
          "Il volantinaggio è finito ed ecco dei nuovi **Contatti** per la scuola! Gli [[Eventi]] servono ad ampliare il pubblico che potrai invitare a fare lezioni di prova in palestra.",
          "Non si tratta ancora di nuovi iscritti veri e propri, dovremo inviare le email per invitarli in palestra e, se la prova andrà bene, la scuola avrà una nuova recluta!",
        ],
        focusRegions: ["title", "contacts-counter"],
      },
      {
        id: "watch-first-trial",
        kind: "objective",
        title: "Osserva La mia giornata",
        body: [
          "Torniamo in [[Posta]] e attendiamo la risposta a una delle email che hai già inviato.",
        ],
        focusRegions: ["day-panel"],
        navigateTo: "mail",
        // A booked trial is counted for good; the trial itself moves on from
        // "scheduled" after a few seconds, so its status cannot be the signal.
        isComplete: ({ state }) => state.statistics.trialsBooked >= 1,
      },
    ],
  },
  {
    id: "first-trial",
    pauseWhileActive: true,
    canStart: ({ state }) => state.statistics.trialsBooked >= 1,
    steps: [
      {
        id: "trial-booked",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Lezioni di prova",
        body: [
          "Come puoi vedere, una delle tue email ha avuto effetto: la prima prova in palestra è ora prenotata!",
          "La sezione “La mia giornata” è molto utile per tenere traccia di tutti gli avvenimenti dell'Ordine delle Onde, tra cui scoprire se la prova avrà successo o meno.",
          "Ora non ti resta che continuare a mandare email e fare eventi fino a che qualcuno non si iscriverà...",
          "Conto su di te!"
        ],
        focusRegions: ["day-panel", "first-trial-row"],
      },
    ],
  },
  {
    id: "first-legendary",
    pauseWhileActive: true,
    canStart: ({ state }) =>
      state.network.schoolCount === 0 &&
      state.contacts.some(
        (contact) =>
          contact.specialProfileId === "andrea-simonazzi" &&
          contact.status === "writing",
      ),
    steps: [
      {
        id: "legendary-rarities",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Un Leggendario è per sempre",
        body: [
          "Finora hai incontrato soltanto persone comuni, ma il mondo non è fatto di persone comuni e di certo non lo è il mondo di LudoSport!",
          "Ogni contatto possiede una rarità: [[r:Comune]], [[r:Raro]], [[r:Ultra Raro]] o [[r:Leggendario]].",
          "Finalmente hai trovato il tuo primo contatto [[r:Leggendario]] e col tempo potrai trovarli tutti, ognuno con effetti e caratteristiche diverse.",
          "I [[r:Leggendari]] sono profili unici e, quando si iscrivono, diventano subito dei Collaboratori delle Onde per darti una mano nella gestione della scuola.",
          "Acchiappali tutti!",
        ],
        focusRegions: ["main", "composer-header"],
        navigateTo: "mail",
        cardPlacement: "left",
      },
    ],
  },
  {
    id: "first-enrollment",
    pauseWhileActive: true,
    canStart: ({ state }) => state.statistics.membersEnrolled >= 1,
    steps: [
      {
        id: "first-fee",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Habemus inscriptum!",
        body: [
          `Ogni nuovo iscritto all'Ordine delle Onde porterà subito nelle nostre casse ${GAME_CONFIG.enrollmentBonus}€ e successivamente una rata di ${GAME_CONFIG.monthlyMemberFee}€ ogni mese di gioco.`,
          "Più iscritti, più quote: è così che la scuola finanzia i suoi miglioramenti. E quando la scuola cresce, ci potrebbero essere sempre più modi per aumentare i fondi.",
          `Pensavi che solo la tua Black Card fosse costosa?`,
        ],
        focusRegions: ["title"],
      },
      {
        id: "open-upgrades",
        kind: "objective",
        title: "Apri gli Upgrade",
        body: [
          "Usa la barra a sinistra e apri [[Upgrade]].",
        ],
        focusRegions: ({ activeView }) =>
          activeView === "upgrades"
            ? ["main"]
            : ["navigation", "upgrades-navigation"],
        isComplete: ({ activeView }) => activeView === "upgrades",
      },
      {
        id: "upgrade-tree",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Sviluppare l'Ordine delle Onde",
        body: [
          "Nella pagina [[Upgrade]] puoi spendere i **Fondi** della scuola per migliorare scrittura, prove, eventi e automazioni.",
          "Gli [[Upgrade]] si sbloccano in vari modi: non serve comprare tutto subito. Scegli ciò che può aiutarti a crescere al meglio.",
        ],
        focusRegions: ["main"],
      },
    ],
  },
  {
    id: FIRST_COLLABORATOR_TUTORIAL_SCENE_ID,
    pauseWhileActive: true,
    canStart: ({ state }) => state.collaborators.length > 0,
    steps: [
      {
        id: "collaborator-introduction",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Una mano in più",
        body: [
          "Abbiamo il nostro primo Collaboratore delle Onde! Ogni collaboratore può occuparsi di una delle Aree di Attività disponibili e, a suon di lavorare alacremente per la scuola di Genova, accumulerà punti Maestria che lo renderanno sempre più bravo ed efficace nel suo lavoro!",
        ],
        focusRegions: ["title"],
      },
      {
        id: "open-first-collaborator",
        kind: "objective",
        title: "Apri la pagina Scuola",
        body: [
          "Apri [[Scuola]] dalla barra a sinistra per raggiungere la sezione Collaboratori.",
        ],
        focusRegions: ({ activeView }) =>
          activeView === "contacts"
            ? ["main", "collaborator-section"]
            : ["navigation", "contacts-navigation"],
        isComplete: ({ activeView }) => activeView === "contacts",
      },
      {
        id: "collaborator-areas",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Aree di Attività",
        body: [
          "Da qui puoi selezionare l'incarico per ogni Collaboratore delle Onde. [[a:Redazione]] automatizza la compilazione delle email; [[a:Eventi]] organizza le attività per scoprire nuovi contatti; [[a:Attrezzatura]] gestisce automaticamente la riparazione delle spade della scuola; [[a:Istruttore]] serve per insegnare e supportare la formazione degli iscritti della scuola per renderli sempre più forti in preparazione ai tornei.",
        ],
        focusRegions: ["main", "collaborator-section"],
        scrollToRegion: "collaborator-section",
      },
      {
        id: "assign-first-collaborator",
        kind: "objective",
        title: "Assegna il tuo primo collaboratore",
        body: [
          "Usa il menu di assegnazione per scegliere l'Area di Attività che preferisci per il tuo primo Collaboratore.",
        ],
        focusRegions: ["main", "collaborator-section"],
        scrollToRegion: "collaborator-section",
        isComplete: ({ state }) => Boolean(state.collaborators[0]?.assignment),
      },
    ],
  },
  {
    id: COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID,
    pauseWhileActive: true,
    canStart: ({ state }) => Boolean(
      state.tutorial.triggeredSceneIds?.includes(
        COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID,
      ),
    ),
    steps: [
      {
        id: "collaborator-teaching-discount",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        body: [
          "Ora che abbiamo un Collaboratore delle Onde, potremmo impiegarlo nell'insegnamento. Questo non è solo utile per automatizzare i processi ripetitivi della scuola, ma porta anche un considerevole sconto sui corsi! (Siamo genovesi dopotutto)",
        ],
        focusRegions: ["main"],
      },
    ],
  },
  {
    id: MEMBER_DEPARTURES_TUTORIAL_SCENE_ID,
    pauseWhileActive: true,
    canStart: ({ state }) => Boolean(
      state.tutorial.triggeredSceneIds?.includes(MEMBER_DEPARTURES_TUTORIAL_SCENE_ID),
    ),
    steps: [
      {
        id: "member-departures-boredom",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Rinnovi mancati",
        body: [
          "L'anno è finito e qualcuno non ha rinnovato l'iscrizione. Niente di personale: senza abbastanza Istruttori e senza corsi durante l'anno, la gente si annoia e scopre all'improvviso che il divano le mancava tantissimo.",
          "Assegna qualche Collaboratore all'Area [[a:Istruttore]] e fai partire dei corsi: chi impara nuove Forme ha molti più motivi per restare.",
        ],
        focusRegions: ["main"],
      },
    ],
  },
  {
    id: SWORD_PURCHASE_TUTORIAL_SCENE_ID,
    pauseWhileActive: true,
    canStart: ({ state }) => state.school.peakActiveMembers >= SWORD_PURCHASE_TUTORIAL_MEMBERS,
    steps: [
      {
        id: "sword-purchase-queue",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Dieci iscritti, sei spade",
        body: ({ state }) => [
          `Dieci **Iscritti** e sole ${state.equipment.totalSwords === 6 ? "sei" : state.equipment.totalSwords.toLocaleString("it-IT")} **Spade** della scuola: a Genova si chiama ottimizzazione delle risorse. In palestra, invece, si chiama fare la fila.`,
          "Ogni corso e ogni prova consumano le spade, e prima o poi qualcuna si rompe...",
        ],
        focusRegions: ["title", "title-equipment"],
      },
      {
        id: "open-sword-menu",
        kind: "objective",
        title: "Apri il menu delle spade",
        body: ["Premi la spada nella barra in alto."],
        focusRegions: ["title", "title-equipment"],
        isComplete: ({ equipmentOpen }) => Boolean(equipmentOpen),
      },
      {
        id: "sword-purchase-supplier",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Spade nuove",
        body: ({ state }) => [
          "Libere, in uso, rotte, usura: qui c'è tutto. Quando le spade non bastano più, si comprano da questo bottone.",
          isOfficialSwordSupplierUnlocked(state.upgrades)
            ? "Il conto con il fornitore è già aperto: con ×1, ×10 e ×100 scegli quante comprarne in una volta sola. Attenzione a non finire tutti i fondi!"
            : "Prima però serve sbloccare «Fornitore ufficiale», nel ramo Attrezzatura degli [[Upgrade]]. Attento ai prezzi di Lama di Luce, gli piace cambiare!",
        ],
        focusRegions: ["title", "title-equipment"],
        opensEquipment: true,
        cardPlacement: "below",
      },
    ],
  },
  {
    id: "collaborator-sectors",
    pauseWhileActive: true,
    canStart: ({ state }) => state.collaboratorManagement.aggregateViewUnlocked,
    steps: [
      {
        id: "collaborator-growth",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Una squadra che cresce",
        body: [
          "La scuola sta crescendo e con essa anche i Collaboratori delle Onde. Gestire ogni persona, però, sta diventando scomodo, quindi iniziamo ad organizzare l'organico per settore.",
          "Da questo momento controllerai quante persone lavorano in ogni area, senza dover scegliere i singoli Collaboratori",
          "Perfettamente equilibrato, come tutto dovrebbe essere..."
        ],
        focusRegions: ["main"],
      },
      {
        id: "open-collaborator-sectors",
        kind: "objective",
        title: "Apri la gestione dei Collaboratori",
        body: [
          "Apri [[Scuola]] dalla barra a sinistra per vedere i settori e il conteggio dei Collaboratori liberi accanto al titolo.",
        ],
        focusRegions: ({ activeView }) =>
          activeView === "contacts"
            ? ["main", "collaborator-sectors"]
            : ["navigation", "contacts-navigation"],
        isComplete: ({ activeView }) => activeView === "contacts",
      },
      {
        id: "collaborator-staffing",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Organico per settore",
        body: [
          "Usa i tasti + e - nelle box dei settori per definire quanti Collaboratori lavoreranno in ogni area.",
          "I Collaboratori liberi si spostano subito.",
          "Chi è impegnato in un Evento o in una formazione conclude prima il lavoro assegnatogli per poi passare al suo nuovo lavoro.",
        ],
        focusRegions: ["main", "collaborator-sectors"],
        navigateTo: "contacts",
      },
    ],
  },
  {
    id: "social-evolution",
    pauseWhileActive: true,
    canStart: ({ state }) => state.unlocks.social,
    steps: [
      {
        id: "redaction-becomes-social",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "La Scuola diventa Social!",
        body: [
          "L’Ordine delle Onde conta ormai 15 collaboratori: è arrivato il momento di svecchiarci. Perché siamo giovani, siamo trendy, siamo... Social!",
          "Da oggi i collaboratori non si limiteranno più a scrivere email: creeranno contenuti, aumenteranno i nostri **Follower** e porteranno più pubblico agli [[Eventi]]. Sempre gratis, naturalmente: in fondo, la visibilità non ha prezzo.",
          "Per trovare nuovi **Contatti** serviranno ancora gli [[Eventi]]. Abbiamo chiesto ai Social di promuoverli e hanno già preparato diciassette hashtag, tre balletti e un comunicato per un certo Guardia di Finanza.",
          "Dev’essere un influencer importante: lo nominano tutti.",
        ],
        focusRegions: ["main"],
      },
      {
        id: "social-system",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Contenuti, Follower e Sponsorizzazioni",
        body: [
          "I collaboratori [[a:Social]] producono sempre contenuti online. Quando c'è una Email da scrivere, le danno priorità senza interrompere completamente i contenuti.",
          "Ogni contenuto può generare **Follower**. Ogni Follower aumenta anche la **Fama** della scuola e l'affluenza agli [[Eventi]], che restano il modo per ottenere nuovi **Contatti**.",
          "I **Follower** producono inoltre una rendita costante grazie alle sponsorizzazioni che si aggiungono alle rette mensili degli iscritti.",
          "Facile, no? Forse userò un Collaboratore [[a:Social]] per farmi ripartire la stampante..."
        ],
        focusRegions: ["title", "main"],
      },
      {
        id: "open-collaborators",
        kind: "objective",
        title: "Apri la pagina Scuola",
        body: [
          "Premi su [[Scuola]] nella barra a sinistra e raggiungi l'elenco dei Collaboratori delle Onde.",
        ],
        focusRegions: ({ activeView }) =>
          activeView === "contacts"
            ? ["main"]
            : ["navigation", "contacts-navigation"],
        isComplete: ({ activeView }) => activeView === "contacts",
      },
      {
        id: "assign-social-collaborator",
        kind: "objective",
        title: "Assegna un collaboratore ai Social",
        body: ({ state }) => [
          state.collaboratorManagement.aggregateViewUnlocked
            ? "Aumenta di almeno uno i posti [[a:Social]]. Senza Collaboratori assegnati le Email e i contenuti online non avanzeranno automaticamente."
            : "Imposta almeno un Collaboratore sui [[a:Social]]. Senza Collaboratori assegnati le Email e i contenuti online non avanzeranno automaticamente.",
        ],
        focusRegions: ({ state }) => state.collaboratorManagement.aggregateViewUnlocked
          ? ["main", "collaborator-sectors"]
          : ["main", "collaborator-social-assignment"],
        isComplete: ({ state }) => state.collaborators.some(
          (collaborator) => collaborator.assignment === "writing",
        ),
      },
    ],
  },
  {
    id: "gadget-laboratory",
    pauseWhileActive: true,
    canStart: ({ state }) => state.unlocks.gadget,
    steps: [
      {
        id: "gadget-unlocked",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Il Laboratorio dei Gadget è aperto",
        body: [
          "Vinta la Champion's Arena: una vittoria così merita un portachiavi. Anzi, un catalogo intero di [[Gadget]]!",
          "Il primo progetto è già disponibile, ma dovrai acquistarlo e svilupparlo prima di metterlo in catalogo.",
        ],
        focusRegions: ["navigation", "gadget-navigation"],
      },
      {
        id: "open-gadgets",
        kind: "objective",
        title: "Apri Gadget",
        body: [
          "Seleziona [[Gadget]] nella barra a sinistra per entrare nel laboratorio.",
        ],
        focusRegions: ({ activeView }) =>
          activeView === "gadget"
            ? ["main"]
            : ["navigation", "gadget-navigation"],
        isComplete: ({ activeView }) => activeView === "gadget",
      },
      {
        id: "gadget-workshop",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Il motore del capitalismo",
        body: [
          "La Produttività della sezione [[Gadget]] è la somma del lavoro dei Collaboratori assegnati al settore. Senza di loro, progetti e revisioni restano fermi.",
          "Il Pubblico raggiungibile indica quante persone puoi rendere partecipi del nostro splendido lavoro. **Iscritti** e, con gli [[Upgrade]], **Follower** lo fanno crescere; oltre quella soglia restano possibili vendite occasionali, ma più lente.",
        ],
        focusRegions: ["main", "gadget-overview"],
      },
      {
        id: "gadget-catalog-flow",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Dal progetto alle borse di studio",
        body: [
          "Acquista un progetto, attendi lo sviluppo e affronta il collaudo. Quando accetti il risultato, il prodotto entra in vendita automatica.",
          "Una qualità più alta aumenta la possibilità di vendita ed anche il guadagno per unità venduta.",
          "Migliorare la qualità dei prodotti potrebbe anche sbloccare nuove rarità!",
        ],
        focusRegions: ["main", "gadget-catalog"],
        scrollToRegion: "gadget-catalog",
      },
    ],
  },
  {
    id: "first-tournament",
    pauseWhileActive: true,
    canStart: ({ state }) => state.tournaments.results.length > 0,
    steps: [
      {
        id: "open-tournaments",
        kind: "objective",
        title: "Apri Tornei",
        body: ["Il primo torneo della scuola si è concluso! I risultati ti aspettano nella pagina [[Tornei]]."],
        focusRegions: ({ activeView }) =>
          activeView === "tournaments" ? ["main"] : ["navigation", "tournaments-navigation"],
        isComplete: ({ activeView }) => activeView === "tournaments",
      },
      {
        id: "watch-the-final",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Una finale da vedere",
        body: [
          "Ogni torneo che disputeremo finirà nell'archivio: gironi, tabellone e titoli in palio.",
          "Se in finale c'è uno dei nostri, potremo addirittura guardarla cliccando su «Guarda la finale»: uno spettacolo senza esclusione di colpi, con pubblico, Giudici di Gara e Giudici di Stile. Popcorn non inclusi.",
        ],
        focusRegions: ["main", "tournament-final"],
        tournamentTab: "results",
      },
      {
        id: "arena-and-style",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Arena e Stile",
        body: [
          "Ogni incontro dà due risultati. In Arena vince chi mette a segno più OH sul proprio avversario.",
          "Lo Stile è il voto dei giudici: si parte con una base di 5,5 e si può salire fino al leggendario 10. «Dettaglio incontro» mostra la scheda di ogni combattimento.",
        ],
        focusRegions: ["main", "tournament-groups"],
        cardPlacement: "right",
        tournamentTab: "results",
      },
      {
        id: "who-goes-on",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Chi va avanti",
        body: [
          "Arena e Stile hanno due podi separati: due classifiche, due modi per diventare campioni.",
          "I migliori si qualificano al Torneo Accademico che si svolge attorno ad aprile, e da lì al Nazionale italiano di giugno fino ad arrivare alla Champion's Arena, il torneo mondiale di LudoSport, che si tiene a novembre.",
        ],
        focusRegions: ["main", "tournament-podium"],
        scrollToRegion: "tournament-podium",
        tournamentTab: "results",
      },
      {
        id: "this-year-goal",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "La nostra meta",
        body: [
          "Un titolo al Torneo Accademico, in Arena o in Stile, ci darà accesso alla [[Rete delle Onde]]: il nostro unico modo per aprire nuove scuole e accrescere la nostra fama in tutto il mondo!",
        ],
        focusRegions: [],
        tournamentTab: "results",
      },
    ],
  },
  {
    id: "network-introduction",
    pauseWhileActive: true,
    canStart: ({ state }) =>
      state.network.schoolCount === 0 && hasPrestigeTitle(state),
    steps: [
      {
        id: "open-network",
        kind: "objective",
        title: "Apri la Rete delle Onde",
        body: ["Un titolo all'Accademico e l'Ordine si accorge di te. Nella barra a sinistra è comparsa una voce nuova: [[Rete]]."],
        focusRegions: ({ activeView }) =>
          activeView === "network" ? ["main"] : ["navigation", "network-navigation"],
        isComplete: ({ activeView }) => activeView === "network",
      },
      {
        id: "network-map",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "La mappa della Rete",
        body: [
          "Questa è la tua scuola, per ora l'unica. Quando ne fondi una nuova, quella che lasci resta sulla mappa con il suo nome, la città e la **Fama**.",
          "Non dovrai più gestirla: diventa una sede dell'Ordine.",
        ],
        focusRegions: ["main", "network-map"],
        cardPlacement: "below",
      },
      {
        id: "founding-restarts",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Fondare è ricominciare",
        body: [
          "La nuova scuola parte da zero: **Fondi**, **Iscritti**, collaboratori, [[Upgrade]] e **Fama**.",
          `Porti con te la **Reputazione**: ${GAME_CONFIG.reputationAcademyTitlePoints} punto per il titolo all'Accademico, ${GAME_CONFIG.reputationNationalTitlePoints} per il Nazionale e per ognuno degli altri grandi tornei vinti, più quelli che vengono dalla **Fama**. Più resti, più ne porti.`,
        ],
        focusRegions: ["main", "network-ready"],
        cardPlacement: "right",
      },
      {
        id: "spend-reputation",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Dove spendere la Reputazione",
        body: [
          `La spendi una volta sola, alla fondazione, in sei potenziamenti permanenti: ogni punto vale +${Math.round(GAME_CONFIG.reputationStep * 100)}%.`,
          "Oppure in una rendita: la scuola che lasci continua a mandarti soldi ogni mese.",
        ],
        focusRegions: ["main", "network-upgrades"],
        cardPlacement: "right",
      },
      {
        id: "what-stays",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Cosa resta",
        body: [
          "Ludodex, traguardi, [[r:Leggendari]] Segreti scoperti e segreti già trovati restano per sempre.",
          "E un [[r:Leggendario]] a caso ti segue nella nuova scuola, ripartendo da zero come tutti.",
        ],
        focusRegions: ["main", "network-keeps"],
        cardPlacement: "left",
      },
      {
        id: "no-hurry",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Nessuna fretta",
        body: [
          "Puoi fondare oggi o tra dieci anni di gioco. Fondare presto fa provare prima i potenziamenti; restare porta più punti.",
          "Quando sei pronto, il pulsante è qui.",
        ],
        focusRegions: ["main", "network-found"],
        cardPlacement: "right",
      },
    ],
  },
  {
    id: "reptile-introduction",
    pauseWhileActive: true,
    canStart: ({ state }) => state.tournaments.reptile.unlocked,
    steps: [
      {
        id: "open-tournaments",
        kind: "objective",
        title: "Apri Tornei",
        body: ["Il Nazionale ha lasciato il segno: ora la scuola può organizzare un torneo tutto suo. Apri [[Tornei]]."],
        focusRegions: ({ activeView }) =>
          activeView === "tournaments" ? ["main"] : ["navigation", "tournaments-navigation"],
        isComplete: ({ activeView }) => activeView === "tournaments",
      },
      {
        id: "reptile-tournament",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Il Torneo Reptile",
        body: ({ state }) => [
          `Un torneo a coppie, a ${state.school.city}, ogni luglio. Lo organizzi tu: affitti il palazzetto, prepari tutto e la scuola ci guadagna **Fama**, **follower** e l'incasso del banchetto.`,
          `Il palazzetto costa ${formatCurrency(GAME_CONFIG.reptileVenueCost)}. Puoi annullare quando vuoi e riavere metà: l'altra metà resta al gestore, come da tradizione.`,
        ],
        focusRegions: ["main", "reptile-hero"],
        cardPlacement: "below",
        tournamentTab: "reptile",
      },
      {
        id: "five-bars",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Cinque barre, cinque settori",
        body: [
          "Ogni settore riempie la sua barra: [[a:Social]], [[a:Eventi]], [[a:Attrezzature]], [[a:Istruttori]] e [[a:Gadget]].",
          "Chi lavora dà metà del suo impegno alla barra e metà al lavoro di sempre. Chi è fermo dà tutto. Chi è senza incarico aiuta la barra più indietro, ma a metà.",
          "Se in un settore non c'è nessuno, la sua barra resta ferma. A barra piena quel settore torna al ritmo normale.",
        ],
        focusRegions: ["main", "reptile-preparation"],
        scrollToRegion: "reptile-preparation",
        cardPlacement: "right",
        tournamentTab: "reptile",
      },
      {
        id: "july-or-next",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Luglio, oppure il prossimo",
        body: [
          "Il torneo si gioca a luglio solo con tutte le barre piene. Altrimenti slitta al luglio dopo.",
          "Prima finisci, migliore è la resa: in tre mesi è al massimo. Il giorno del torneo servono due **Spade** libere per squadra, e ogni spada che manca pesa sulla resa.",
        ],
        focusRegions: ["main", "reptile-month"],
        scrollToRegion: "reptile-hero",
        cardPlacement: "left",
        tournamentTab: "reptile",
      },
      {
        id: "principal-at-the-venue",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Il preside in palazzetto",
        body: [
          "Fino a fine giugno puoi giocare «La giornata degli imprevisti»: 30 secondi, un solo tentativo, fino a +25% sulla resa.",
          "Non salva un torneo preparato male, ma ne migliora uno buono. Se vuoi provarla prima, c'è il Tutorial.",
        ],
        // The minigame card exists once the tournament is organized.
        focusRegions: ({ state }) =>
          state.tournaments.reptile.activeEdition ? ["main", "reptile-minigame"] : ["main"],
        cardPlacement: "left",
        tournamentTab: "reptile",
      },
    ],
  },
] as const;
