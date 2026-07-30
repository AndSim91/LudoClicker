import { GAME_CONFIG } from "../game/config";
import { isGameAreaUnlocked } from "../game/progression";
import type { GameState } from "../game/types";

export const TUTORIAL_REGION_IDS = [
  "title",
  "contacts-counter",
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

export const TUTORIAL_SCENE_IDS = [
  ...LEGACY_TUTORIAL_SCENE_IDS,
  FIRST_COLLABORATOR_TUTORIAL_SCENE_ID,
  COLLABORATOR_TEACHING_TUTORIAL_SCENE_ID,
  "gadget-laboratory",
] as const;

export type TutorialSceneId = typeof TUTORIAL_SCENE_IDS[number];

export interface TutorialRuntimeContext {
  state: GameState;
  activeView: string;
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
  cardPlacement?: "left";
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
        body: [
          "Congratulazioni per aver accettato il posto da Preside dell'Ordine delle Onde di Genova!",
          "Io sono A.N.D.E.R., il tuo assistente AI. Ti aiuterò a far crescere la tua prima scuola di LudoSport!",
        ],
        focusRegions: ["title"],
      },
      {
        id: "draft-ready",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Una mail al giorno...",
        body: [
          "Ho predisposto qualche contatto email a cui scrivere. Li ho trovati scrivendo lettere a caso fino a notte fonda, dovresti ringraziarmi.",
          "Ora scrivi una bella mail pubblicitaria da spedire, il messaggio verrà inviato automaticamente poi dovremo solo attendere una risposta...",
        ],
        focusRegions: ["main"],
      },
      {
        id: "write-first-email",
        kind: "objective",
        title: "Invia la tua prima mail",
        body: [
          "Premi un tasto qualsiasi fino a completare la bozza. Con Invio automatico attivo partirà subito; se lo disattivi, potrai rileggerla e inviarla con un ultimo tasto o clic. Non preoccuparti degli errori di battitura: siamo solo agli inizi.",
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
          "La prima missione è completata. Ora apri la pagina Eventi dalla barra delle applicazioni per organizzare nuove attività per la scuola.",
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
          "Gli Eventi portano il nostro sport fuori dalla palestra: incontrerai persone, farai dimostrazioni e potrai scavarti una buca a terra nella speranza che ci siano persone interessate a provare il nostro sport.",
          "Molte attività impegnano iscritti e spade. L'attrezzatura accumula usura e potrebbe anche danneggiarsi: quando serve, dovrai eseguire la manutenzione prima di riutilizzarla! Il Volantinaggio gratuito, invece, non richiede né iscritti né attrezzatura.",
        ],
        focusRegions: ["main"],
      },
      {
        id: "start-free-sparring",
        kind: "objective",
        title: "Avvia il volantinaggio gratuito",
        body: [
          "Trova “Volantinaggio” e premi “Partecipa gratis”. Non servono iscritti o spade; poi attendi il suo completamento.",
        ],
        focusRegions: ["main", "park-sparring-action"],
        isComplete: ({ state }) => state.acquisitionEvents.some(
          (event) => event.tutorialSceneId === "first-event",
        ),
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
        isComplete: ({ state }) => state.acquisitionEvents.some(
          (event) => event.tutorialSceneId === "first-event" && event.status === "completed",
        ),
      },
      {
        id: "contacts-increased",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Abbiamo dei contatti!",
        body: ({ state }) => {
          const contactReward = state.acquisitionEvents.find(
            (event) => event.tutorialSceneId === "first-event",
          )?.contactReward ?? GAME_CONFIG.tutorialSparringMinimumContacts;
          return [
            `Il volantinaggio è finito: +${contactReward} ${contactReward === 1 ? "nuovo contatto" : "nuovi contatti"} per la scuola! Gli Eventi servono ad ampliare il pubblico che potrai invitare a fare lezioni di prova in palestra.`,
            "Non si tratta ancora di iscritti veri e propri, dovremo inviare le email per invitarli in palestra e, se la prova va bene, la scuola avrà una nuova recluta!",
          ];
        },
        focusRegions: ["title", "contacts-counter"],
      },
      {
        id: "watch-first-trial",
        kind: "objective",
        title: "Osserva La mia giornata",
        body: [
          "Torniamo in Posta e attendiamo la risposta a una delle email inviate a inizio partita.",
        ],
        focusRegions: ["day-panel"],
        navigateTo: "mail",
        isComplete: ({ state }) => state.scheduledTrials.some(
          (trial) => trial.tutorialSceneId === "first-event" && trial.status === "scheduled",
        ),
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
          "Come puoi vedere, una delle tue precedenti email ha avuto effetto: la prima prova in palestra è ora prenotata!",
          "La sezione “La mia giornata” è molto utile per tenere traccia di tutti gli avvenimenti dell'Ordine delle Onde, tra cui scoprire se la prova avrà successo o meno.",
          "Ora non ti resta che continuare a mandare mail e fare eventi fino a che qualcuno non si iscriverà...",
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
      state.network.schools.length === 0 &&
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
          "Finora hai incontrato soltanto persone comuni. Ogni possibile iscritto possiede però una rarità possibile: Comune, Raro, Ultra Raro o Leggendario.",
          "Finalmente hai incontrato il tuo primo atleta Leggendario della partita e col tempo potrai trovarli tutti, ognuno con effetti e caratteristiche diverse.",
          "I Leggendari sono profili unici e, quando si iscrivono, diventano subito dei Collaboratori delle Onde per darti una mano nella gestione della scuola.",
          "Collezionali tutti!",
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
          `Ogni nuovo iscritto all'Ordine delle Onde porterà subito nella nostre casse ${GAME_CONFIG.enrollmentBonus}€ e successivamente una rata di ${GAME_CONFIG.monthlyMemberFee}€ ogni mese di gioco.`,
          `Ogni Forma o corso conosciuti dal singolo iscritto aggiunge ${GAME_CONFIG.monthlyMemberFormBonus}€ alla quota mensile. È così che la scuola finanzia i suoi miglioramenti.`,
          `Pensavi che solo la tua Black Card fosse costosa?`,
        ],
        focusRegions: ["title"],
      },
      {
        id: "open-upgrades",
        kind: "objective",
        title: "Apri gli Upgrade",
        body: [
          "Usa la barra delle applicazioni a sinistra e apri Upgrade.",
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
          "Nella pagine Upgrade puoi spendere i fondi della scuola per migliorare scrittura, prove, eventi e automazioni.",
          "Gli Upgrade si sbloccano in vari modi: non serve comprare tutto subito. Scegli ciò che può aiutarti a crescere al meglio.",
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
          "Abbiamo il nostro primo Collaboratore delle Onde! Ogni collaboratore può occuparsi di una sola delle Aree di Attività disponibili alla volta e, a suon di lavorare alacremente per la scuola di Genova, accumulerà punti Maestria che lo renderanno sempre più bravo ed efficace!",
        ],
        focusRegions: ["title"],
      },
      {
        id: "open-first-collaborator",
        kind: "objective",
        title: "Apri la pagina Scuola",
        body: [
          "Apri Scuola dalla barra laterale per raggiungere la sezione Collaboratori.",
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
          "Da qui puoi selezionare l'incarico per ogni Collaboratore delle Onde. Redazione automatizza la compilazione delle email ai contatti; Eventi organizza le attività fuori dalla scuola per farla crescere; Attrezzatura serve per la manutenzione e riparazione delle spade della scuola; Istruttore serve per insegnare e supportare la formazione degli iscritti della scuola per renderli sempre più forti in preparazione ai tornei.",
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
          "Ora che abbiamo i Collaboratori delle Onde, potremmo impiegarli nell'insegnamento. Questo non è solo utile per automatizzare i processi ripetitivi della scuola, ma porta anche un considerevole sconto sui corsi! (Siamo genovesi dopotutto)",
        ],
        focusRegions: ["main"],
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
          "Apri Scuola dalla barra laterale per vedere i settori e il conteggio dei Collaboratori liberi accanto al titolo.",
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
          "L’Ordine delle Onde ha raggiunto 35 iscritti attivi: è arrivato il momento di svecchiarci. Perché siamo giovani, siamo trendy, siamo... Social!",
          "Da oggi i collaboratori non si limiteranno più a scrivere email: creeranno contenuti, aumenteranno i nostri Follower e porteranno più pubblico agli Eventi. Sempre gratis, naturalmente: in fondo, la visibilità non ha prezzo.",
          "Per trovare nuovi Contatti serviranno ancora gli Eventi. Abbiamo chiesto ai Social di promuoverli e hanno già preparato diciassette hashtag, tre balletti e un comunicato per un certo Guardia di Finanza.",
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
          "I collaboratori Social producono sempre contenuti online. Quando c'è una Email da scrivere, le danno priorità senza interrompere completamente i contenuti.",
          "Ogni contenuto può generare Follower. Ogni Follower aumenta anche la Fama della scuola e l'affluenza agli Eventi, che restano il modo per ottenere nuovi Contatti.",
          "I Follower producono inoltre una rendita costante grazie alle sponsorizzazioni che si aggiungono alle rette mensili degli iscritti.",
          "Facile, no? Forse userò un Collaboratore Social per farmi ripartire la stampante..."
        ],
        focusRegions: ["title", "main"],
      },
      {
        id: "open-collaborators",
        kind: "objective",
        title: "Apri la pagina Scuola",
        body: [
          "Premi su Scuola nella barra laterale e raggiungi l'elenco dei Collaboratori delle Onde.",
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
            ? "Aumenta di almeno uno i posti Social. Senza Collaboratori assegnati le Email e i contenuti online non avanzeranno automaticamente."
            : "Imposta almeno un Collaboratore sui Social. Senza Collaboratori assegnati le Email e i contenuti online non avanzeranno automaticamente.",
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
          "La prima vittoria all'Accademico non si scorda mai. E per renderla ancora più iconica, abbiamo sbloccato i Gadget!",
          "Il primo progetto è già disponibile, ma dovrai acquistarlo e svilupparlo prima di metterlo in catalogo.",
        ],
        focusRegions: ["navigation", "gadget-navigation"],
      },
      {
        id: "open-gadgets",
        kind: "objective",
        title: "Apri Gadget",
        body: [
          "Seleziona Gadget nella barra laterale per entrare nel laboratorio.",
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
          "La Produttività della sezione Gadget è la somma del lavoro dei Collaboratori assegnati al settore. Senza di loro, progetti e revisioni restano fermi.",
          "Il Pubblico raggiungibile indica quante persone puoi rendere partecipi del nostro splendido lavoro. Iscritti e, con gli Upgrade, Follower lo fanno crescere; oltre quella soglia restano possibili vendite occasionali, ma più lente.",
        ],
        focusRegions: ["main", "gadget-overview"],
      },
      {
        id: "gadget-catalog-flow",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Dal progetto alle borse di studio",
        body: [
          "Acquista un progetto, attendi lo sviluppo e affronta la prova qualità. Quando accetti il risultato, il prodotto entra in vendita automatica.",
          "Una qualità più alta aumenta la possibilità di vendita ed anche il guadagno per unità venduta.",
          "Migliorare la qualità dei prodotti potrebbe anche sbloccare nuove rarità!",
        ],
        focusRegions: ["main", "gadget-catalog"],
        scrollToRegion: "gadget-catalog",
      },
    ],
  },
] as const;
