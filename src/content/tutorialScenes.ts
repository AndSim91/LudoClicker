import { GAME_CONFIG } from "../game/config";
import { isAnnualPlanningUnlocked } from "../game/annualReport";
import { hasPrestigeTitle, isGameAreaUnlocked } from "../game/progression";
import { isOfficialSwordSupplierUnlocked, isSISTechnicianCourseUnlocked } from "./upgrades";
import { formatCurrency } from "../shared/formatters";
import { FIRST_EVENT_TUTORIAL_SCENE_ID, hasCompletedTutorialSparring, isTutorialSceneFinished } from "../game/tutorialProgress";
import { getRunningAcquisitionEvents } from "../game/runtimeIndexes";
import { selectContactsAwaitingEmail } from "../game/selectors";
import { FORMS_TEACHING_TUTORIAL_SCENE_ID } from "../game/tutorialScholarship";
import type { GameState } from "../game/types";

export { FORMS_TEACHING_TUTORIAL_SCENE_ID };

/** The collaborator the Forme tutorial talks about: Andrea Simonazzi, or the first one. */
function getTutorialInstructor(state: GameState) {
  return state.collaborators.find((collaborator) => collaborator.specialProfileId === "andrea-simonazzi") ??
    state.collaborators[0];
}

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
  "planning-grades",
  "planning-highlight",
  "planning-sis",
  "planning-swords",
  "planning-funds",
  "planning-forecast",
  "planning-toggle",
  "planning-confirm",
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
/** When Tornei opens with 8 athletes with Forma 1 (08/10/2026). */
export const TOURNAMENTS_OPENING_TUTORIAL_SCENE_ID = "tournaments-opening" as const;
/** The first time there is nobody left to write to and no event running (08/10/2026). */
export const OUT_OF_CONTACTS_TUTORIAL_SCENE_ID = "out-of-contacts" as const;
/** First yearly departures with no Istruttore assigned (06/10/2026). */
export const MEMBER_DEPARTURES_TUTORIAL_SCENE_ID = "member-departures" as const;
/** At 15 members: the swords menu and the purchase (06/10/2026, 15 dal 08/10). */
export const SWORD_PURCHASE_TUTORIAL_SCENE_ID = "sword-purchase" as const;
export const SWORD_PURCHASE_TUTORIAL_MEMBERS = 15;
/** The first Pianificazione delle Onde, the July after the first Torneo Scolastico (08/10/2026). */
export const ANNUAL_PLANNING_TUTORIAL_SCENE_ID = "annual-planning" as const;

/** Tutorials of the second half of the game (05/10/2026): the migration to v102 marks them done on saves already past them. */
export const LATE_TUTORIAL_SCENE_IDS = [
  "first-tournament",
  "network-introduction",
  "reptile-introduction",
] as const;

export const TUTORIAL_SCENE_IDS = [
  ...LEGACY_TUTORIAL_SCENE_IDS,
  FIRST_COLLABORATOR_TUTORIAL_SCENE_ID,
  FORMS_TEACHING_TUTORIAL_SCENE_ID,
  TOURNAMENTS_OPENING_TUTORIAL_SCENE_ID,
  OUT_OF_CONTACTS_TUTORIAL_SCENE_ID,
  MEMBER_DEPARTURES_TUTORIAL_SCENE_ID,
  SWORD_PURCHASE_TUTORIAL_SCENE_ID,
  ANNUAL_PLANNING_TUTORIAL_SCENE_ID,
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
  /** The Pianificazione delle Onde shows this page while the step is shown. */
  planningPage?: "pagella" | "plan";
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
        // Testi di Andrea (09/10/2026).
        body: [
          `Abbiamo il nostro primo iscritto! Ogni iscrizione porta alle casse della Scuola ben ${GAME_CONFIG.enrollmentBonus}€ di base e successivamente una rata di ${GAME_CONFIG.monthlyMemberFee}€ ogni mese di gioco.`,
          "Più iscritti, più quote: è così che la scuola finanzia la sua crescita. E quando la scuola cresce, anche i servizi che riusciamo a fornire agli iscritti crescono di conseguenza.",
        ],
        focusRegions: ["title"],
      },
      {
        id: "open-upgrades",
        kind: "objective",
        title: "Apri gli Upgrade",
        body: [
          "Usa il menu a sinistra e apri [[Upgrade]].",
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
          "Nella pagina [[Upgrade]] possiamo spendere **Fondi** per migliorare scrittura delle email, eventi, lezioni di prova e gestione generale della scuola.",
          "Gli [[Upgrade]] sono importanti, ma non serve comprare tutto subito. Scegli ciò che può aiutarti a crescere al meglio e sviluppa la tua strategia!",
        ],
        focusRegions: ["main"],
      },
      {
        // 09/10/2026: the first tappa, 10 members, appears in «La mia giornata».
        id: "first-tappa",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "La prima tappa",
        body: [
          "Un iscritto è un bell'inizio, ma dieci iscritti fanno una scuola: abbastanza perché la gente smetta di chiederci se siamo dell'anarchia mentre ci alleniamo.",
          "Ecco la nostra prima tappa: arrivare a 10 **Iscritti**. La trovi in alto, in «La mia giornata»: confido in te!",
        ],
        focusRegions: ["day-panel"],
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
          "Da qui puoi selezionare l'incarico per ogni Collaboratore delle Onde. [[a:Redazione]] automatizza la compilazione delle email; [[a:Eventi]] organizza le attività per scoprire nuovi contatti; [[a:Attrezzatura]] gestisce automaticamente la riparazione delle spade della scuola.",
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
    id: FORMS_TEACHING_TUTORIAL_SCENE_ID,
    pauseWhileActive: true,
    canStart: ({ state }) =>
      state.unlocks.forms && state.school.peakActiveMembers >= GAME_CONFIG.formsUnlockMembers,
    steps: [
      {
        id: "forms-ten-members",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Dieci iscritti",
        body: [
          "Dieci **Iscritti**: non siamo più un gruppo di scappati di casa con le spade laser: siamo una scuola di scappati di casa con le spade laser. È l'ora di farti conoscere le Forme, gli Insegnanti ed i Tornei LudoSport.",
        ],
        focusRegions: ["title"],
      },
      {
        id: "forms-seven",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Le sette Forme",
        body: [
          "In LudoSport le tecniche si imparano attraverso le Forme: sette stili di combattimento che assieme formano un sistema completo e armonico di principi, movimenti e manovre. Ognuna ha una propria filosofia ed un modo differente di essere portata in arena, ed ogni atleta apprende il suo personale modo di combattere Forma dopo Forma.",
          "Il percorso formativo inizia da Forma 1 e 2 con la spada lunga. Con il Corso Y si impara a conoscere anche staffa e doppie spade corte per poi scegliere le proprie armi preferite per le Forme 3, 4 e 5. Infine abbiamo le Forme 6 e 7 che raccolgono e concludono il percorso di un atleta.",
        ],
        focusRegions: ["title"],
      },
      {
        id: "forms-arena-style",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Arena e Stile",
        body: [
          "Ogni Forma porta un atleta a diventare più forte nel combattimento (Arena) o ad affinare la sua pura capacità tecnica (Stile) e tutto questo viene messo alla prova nelle competizioni torneistiche che il network LudoSport offre durante l'anno scolastico.",
        ],
        focusRegions: ["title"],
      },
      {
        id: "forms-first-instructor",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Il primo Istruttore",
        body: [
          "Iniziamo assegnando un collaboratore al ruolo di [[a:Istruttore]]: in questo modo si occuperà di insegnare le Forme ai nostri iscritti e ci aiuterà a non fargli abbandonare la scuola a fine anno. Perché sì: un allievo che si annoia potrebbe riscoprire il piacere della cioccolata calda sul divano e a noi non piace perdere quote d'iscrizione. Siamo genovesi dopotutto!",
        ],
        focusRegions: ["title"],
      },
      {
        id: "assign-first-instructor",
        kind: "objective",
        title: "Assegna un collaboratore all'Area Istruttore",
        body: ({ state }) => [
          `Apri [[Scuola]] e scegli l'Area [[a:Istruttore]] per ${getTutorialInstructor(state)?.displayName ?? "un collaboratore"}.`,
        ],
        focusRegions: ({ activeView }) =>
          activeView === "contacts"
            ? ["main", "collaborator-section"]
            : ["navigation", "contacts-navigation"],
        scrollToRegion: "collaborator-section",
        // ponytail: with no collaborator at all (Andrea Simonazzi always arrives first) the two steps pass by themselves.
        isComplete: ({ state }) => state.collaborators.length === 0 ||
          state.collaborators.some((collaborator) => collaborator.assignment === "instructor"),
      },
      {
        id: "instructor-form-1",
        kind: "objective",
        title: "Fagli imparare la Forma 1 da Istruttore",
        body: [
          "La prima fase è apprendere la Forma da allievo, poi da istruttore, ma è tutto automatico. Di norma il corso Istruttori ha un costo, ma per questa volta offre Todaro con una bella borsa di studio.",
        ],
        focusRegions: ["main", "collaborator-section"],
        scrollToRegion: "collaborator-section",
        isComplete: ({ state }) => state.collaborators.length === 0 ||
          state.collaborators.some((collaborator) =>
            collaborator.instructorForms.includes("form-1") || (
              collaborator.training?.formId === "form-1" &&
              Boolean(collaborator.training.includesInstructorCertification)
            )
          ),
      },
      {
        id: "ander-games",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Gli Ander Games",
        body: [
          "Ogni dicembre teniamo il Torneo Scolastico dell'Ordine delle Onde, detto anche «Ander Games». Ma per poterlo disputare servono almeno 8 atleti iscritti e capaci almeno in Forma 1.",
          "Il tuo prossimo obiettivo è riuscire a disputare il Torneo Scolastico. Non importa quando: dicembre arriva ogni anno, puntuale come Babbo Natale.",
        ],
        // Tornei is still closed (it opens with 8 athletes): the goal lives in «La mia giornata».
        focusRegions: ["day-panel"],
      },
    ],
  },
  {
    // 08/10/2026: when Tornei opens (8 athletes with Forma 1); the next tappa is playing the Scolastico. Testi di Andrea.
    id: TOURNAMENTS_OPENING_TUTORIAL_SCENE_ID,
    pauseWhileActive: true,
    canStart: ({ state }) => state.unlocks.tournaments,
    steps: [
      {
        id: "school-tournament-ahead",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Il Torneo Scolastico",
        body: [
          "Il torneo scolastico è il momento in cui tutti i tuoi allievi si mettono alla prova. Ci saranno dei vincitori e degli sconfitti, ma l'importante è dare il massimo.",
          "Ora che abbiamo i nostri otto atleti pronti per combattere ci rimane solo da aspettare dicembre!",
        ],
        focusRegions: ["day-panel"],
      },
      {
        id: "open-tournaments-page",
        kind: "objective",
        title: "Apri Tornei",
        body: ["La sezione Tornei è ora aperta nel menu qui a fianco: qui troverai il calendario dei tornei e gli atleti che rappresenteranno la nostra scuola durante l'anno accademico."],
        focusRegions: ["navigation", "tournaments-navigation"],
        isComplete: ({ activeView }) => activeView === "tournaments",
      },
      {
        id: "school-tournament-goal",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "La nostra meta",
        body: [
          "Dopo il Torneo Scolastico arriveremo a disputare il Torneo Accademico, da lì si potrà accedere al Nazionale Italiano ed infine arrivare alla Champion's Arena: il torneo mondiale di LudoSport!",
          "Ma per ora voliamo bassi: riuscire a vincere all'Accademico in Arena o in Stile ci darà accesso al [[Network delle Onde]]: il nostro unico modo per aprire nuove scuole e accrescere la nostra fama in tutto il mondo!",
        ],
        focusRegions: ["main"],
      },
    ],
  },
  {
    // 08/10/2026: the address book is empty and no event is out. TESTI DA APPROVARE (Andrea).
    id: OUT_OF_CONTACTS_TUTORIAL_SCENE_ID,
    pauseWhileActive: true,
    canStart: ({ state }) =>
      isTutorialSceneFinished(state, FIRST_EVENT_TUTORIAL_SCENE_ID) &&
      selectContactsAwaitingEmail(state) === 0 &&
      getRunningAcquisitionEvents(state.acquisitionEvents).length === 0,
    steps: [
      {
        id: "out-of-contacts-reminder",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Rubrica vuota",
        body: [
          "Abbiamo scritto a tutti i **Contatti** che avevamo. Proprio a tutti, anche a quello che cercava la sagra della focaccia.",
          "Il modo più veloce per trovarne di nuovi è uscire dalla palestra: gli [[Eventi]] in esterna ci portano in mezzo alla gente, e la gente, ogni tanto, lascia la sua email.",
        ],
        focusRegions: ["navigation", "events-navigation"],
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
        title: "Quindici iscritti, sei spade",
        body: ({ state }) => [
          `Quindici **Iscritti** e sole ${state.equipment.totalSwords === 6 ? "sei" : state.equipment.totalSwords.toLocaleString("it-IT")} **Spade** della scuola: a Genova si chiama ottimizzazione delle risorse. In palestra, invece, si chiama fare la fila.`,
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
    // Panoramica della Pianificazione delle Onde (Andrea, 08/10 22:36): A.N.D.E.R. indica i punti di cui parla.
    id: ANNUAL_PLANNING_TUTORIAL_SCENE_ID,
    pauseWhileActive: true,
    canStart: ({ state }) => state.annual?.planningOpen === true && isAnnualPlanningUnlocked(state),
    steps: [
      {
        id: "planning-grades",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "La Pianificazione delle Onde",
        body: [
          "L'anno accademico è finito e i corsi ripartono a settembre. Ma chi ha tempo non aspetti tempo: il preside di una scuola LudoSport non dorme mai, anzi, fa i piani per l'anno successivo!",
          "Si parte dalla **pagella**: sei materie, dalla A alla E. Niente media e niente bocciati: serve solo a capire dove la scuola corre e dove inciampa.",
        ],
        focusRegions: ["planning-grades"],
        planningPage: "pagella",
        cardPlacement: "below",
      },
      {
        id: "planning-highlight",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Highlight annuale",
        body: [
          "Il momento più importante dell'anno, con due menzioni d'onore. Il prossimo anno vediamo di fare meglio.",
        ],
        focusRegions: ["planning-highlight"],
        planningPage: "pagella",
      },
      {
        id: "planning-sis",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "La SIS",
        body: ({ state }) => [
          `Alla **SIS** i collaboratori diventano **Istruttori**${isSISTechnicianCourseUnlocked(state.upgrades) ? " e **Tecnici**" : ""}. Scegli una Forma sullo schema e premi la scheda del corso: ogni clic, un iscritto.`,
          "I corsi partono appena confermi il piano.",
        ],
        focusRegions: ["planning-sis"],
        planningPage: "plan",
        cardPlacement: "right",
      },
      {
        id: "planning-swords",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Spade per l'anno nuovo",
        body: ({ state }) => [
          "Premi l'elsa per riparare le spade prima di settembre.",
          isOfficialSwordSupplierUnlocked(state.upgrades)
            ? "Quelle nuove le paghi al prezzo di oggi, prima che Lama di Luce si inventi qualche aumento."
            : "Per comprarne di nuove serve «Fornitore ufficiale», nel ramo Attrezzatura degli [[Upgrade]].",
        ],
        focusRegions: ["planning-swords"],
        planningPage: "plan",
        cardPlacement: "right",
      },
      {
        id: "planning-money",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Fondi e guadagni previsti",
        body: [
          "Qui vedi quanto resta dopo il piano e quanto dovremmo incassare il prossimo anno, mese per mese.",
          "Finché non confermi non si spende niente: ogni voce si toglie con la ×.",
        ],
        focusRegions: ["planning-funds", "planning-forecast"],
        planningPage: "plan",
        cardPlacement: "left",
      },
      {
        id: "planning-confirm",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Conferma il piano",
        body: [
          "Quando sei pronto, conferma il piano e l'anno riparte.",
          "Se preferisci che l'estate passi senza fermarsi, spegni «Pianificazione a fine anno» qui in alto: la ritrovi anche nelle Impostazioni.",
        ],
        focusRegions: ["planning-toggle", "planning-confirm"],
        planningPage: "plan",
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
    // After the first Torneo Scolastico actually played (a skipped one leaves no result).
    canStart: ({ state }) => state.tournaments.results.some((result) => result.level === "school"),
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
        // Tappa 1 (07/10/2026): «Chi va avanti» joined with Andrea's text.
        id: "only-the-beginning",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Solo l'inizio",
        body: [
          "Arena e Stile hanno due podi separati: due classifiche, due modi per diventare campioni.",
          "Il torneo scolastico è soltanto l'inizio del tuo viaggio. Gli sconfitti sono tornati ad allenarsi preparandosi per il prossimo anno, mentre i vincitori hanno guadagnato l'accesso al prossimo evento rated dell'anno: il Torneo Accademico, ad aprile!",
          "Da lì si passa al Nazionale italiano di giugno, fino alla Champion's Arena, il torneo mondiale di LudoSport, a novembre.",
        ],
        focusRegions: ["main", "tournament-podium"],
        scrollToRegion: "tournament-podium",
        tournamentTab: "results",
      },
      {
        id: "a-guide-for-the-future",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "Una guida per il futuro",
        body: [
          "Non mi aspetto che lo vinceremo subito quest'anno: i nostri giovani pupilli conoscono ancora poche Forme e hanno bisogno di una guida che li porti verso il futuro.",
          "Cerchiamo di aumentare il numero di collaboratori della scuola: abbiamo bisogno di tutto l'aiuto possibile per crescere.",
        ],
        // The next tappa (8 Collaboratori delle Onde) appears in «La mia giornata».
        focusRegions: ["day-panel"],
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
        title: "Apri il Network delle Onde",
        body: ["Un titolo all'Accademico e l'Ordine si accorge di te. Nella barra a sinistra è comparsa una voce nuova: [[Network]]."],
        focusRegions: ({ activeView }) =>
          activeView === "network" ? ["main"] : ["navigation", "network-navigation"],
        isComplete: ({ activeView }) => activeView === "network",
      },
      {
        id: "network-map",
        kind: "dialog",
        speaker: "A.N.D.E.R.",
        title: "La mappa del Network",
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
