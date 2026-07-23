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
  "folders",
  "messages",
  "main",
  "composer-header",
  "composer-recipient",
  "composer-body",
  "park-sparring-event",
  "park-sparring-action",
  "day-panel",
  "first-trial-row",
  "collaborator-social-assignment",
  "collaborator-sectors",
  "status",
] as const;

export type TutorialRegionId = typeof TUTORIAL_REGION_IDS[number];

export const TUTORIAL_SCENE_IDS = [
  "first-invitation",
  "first-event",
  "first-trial",
  "first-legendary",
  "first-enrollment",
  "collaborator-sectors",
  "social-evolution",
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
  title: string;
  body: TutorialBody;
  focusRegions: RegionSelection;
  hiddenRegions?: RegionSelection;
  navigateTo?: string;
  cardPlacement?: "left";
}

export interface TutorialDialogStep extends TutorialStepBase {
  kind: "dialog";
  speaker: string;
}

export interface TutorialObjectiveStep extends TutorialStepBase {
  kind: "objective";
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
          "Ogni attività impegna iscritti e spade. L'attrezzatura accumula usura e potrebbe anche danneggiarsi: quando serve, dovrai eseguire la manutenzione prima di riutilizzarla!",
        ],
        focusRegions: ["main"],
      },
      {
        id: "start-free-sparring",
        kind: "objective",
        title: "Avvia l'evento di sparring gratuito",
        body: [
          "Trova “Sparring al parco” e premi “Partecipa gratis”. Poi attendi il suo completamento.",
        ],
        focusRegions: ["main", "park-sparring-action"],
        isComplete: ({ state }) => state.acquisitionEvents.some(
          (event) => event.tutorialSceneId === "first-event",
        ),
      },
      {
        id: "wait-free-sparring",
        kind: "objective",
        title: "Attendi la fine dello sparring",
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
            `Lo sparring è finito: +${contactReward} ${contactReward === 1 ? "nuovo contatto" : "nuovi contatti"} per la scuola! Gli Eventi servono ad ampliare il pubblico che potrai invitare a fare lezioni di prova in palestra.`,
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
          "Abbiamo raggiunto il nono Collaboratore delle Onde. Gestire ogni persona singolarmente stava diventando scomodo, quindi la sezione Collaboratori ora raggruppa l'organico per settore.",
          "Il cambiamento è definitivo: da questo momento controllerai quante persone lavorano in ogni area, senza dover scegliere i singoli nomi.",
        ],
        focusRegions: ["main"],
      },
      {
        id: "open-collaborator-sectors",
        kind: "objective",
        title: "Apri la gestione dei Collaboratori",
        body: [
          "Apri Iscritti dalla barra laterale per vedere i settori e il riepilogo Non assegnati/Totali.",
        ],
        focusRegions: ({ activeView }) =>
          activeView === "contacts"
            ? ["main", "collaborator-sectors"]
            : ["navigation", "contacts-navigation"],
        isComplete: ({ activeView }) => activeView === "contacts",
      },
      {
        id: "collaborator-presets",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Tre preset per l'organico",
        body: [
          "Ogni preset conserva il numero desiderato di Collaboratori in ciascun settore. Imposta i valori, salvalo e applicalo quando vuoi cambiare priorità.",
          "I Collaboratori liberi si spostano subito. Chi è impegnato in un Evento o in una formazione conclude prima il lavoro; gli eventuali posti mancanti restano nel preset e saranno occupati automaticamente dai prossimi Collaboratori disponibili.",
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
          "Da oggi i collaboratori non si limiteranno più a scrivere email: lavoreranno anche per aumentare i nostri Contatti e i nostri Follower. Sempre gratis, naturalmente: in fondo, la visibilità non ha prezzo.",
          "Abbiamo chiesto loro di fare rete e hanno preso l’incarico molto sul serio: stanno contattando amici, sindacati, l’Ispettorato del Lavoro e perfino un certo Guardia di Finanza.",
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
          "I collaboratori Social daranno sempre priorità alle Email. Quando non ci sono Email da scrivere, useranno le loro capacità per produrre contenuti online.",
          "Ogni contenuto può generare Follower e nuovi Contatti. Ogni Follower ottenuto aumenta anche la Fama della scuola e migliora la possibilità di trovare sempre più Contatti nuovi.",
          "I Follower producono inoltre una rendita costante grazie alle sponsorizzazioni che si aggiungono alle rette mensili degli iscritti.",
          "Facile, no? Forse userò un Collaboratore Social per farmi ripartire la stampante..."
        ],
        focusRegions: ["title", "main"],
      },
      {
        id: "open-collaborators",
        kind: "objective",
        title: "Apri la pagina Iscritti",
        body: [
          "Premi su Iscritti nella barra laterale e raggiungi l'elenco dei Collaboratori delle Onde.",
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
            ? "Imposta almeno un posto Social in un preset, salvalo e applicalo. Senza Collaboratori assegnati le Email e i contenuti online non avanzeranno automaticamente."
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
] as const;
