import { FORM_DEFINITIONS } from "./forms";
import { COLLABORATOR_MASTERY_LEVELS } from "./mastery";
import { PERSON_RARITIES } from "./rarities";
import {
  SECRET_LEGENDARIES,
  SECRET_LEGENDARY_IDS,
  getSecretLegendaryProfile,
  type SecretLegendaryId,
} from "./secretLegendaries";
import { UPGRADE_PRICING } from "./upgrades";
import { SPECIAL_COLLABORATORS } from "./specialCollaborators";
import { TOURNAMENT_DEFINITIONS } from "./tournaments";
import { GAME_CONFIG } from "../game/config";
import { formatCurrency } from "../shared/formatters";
import type { SpecialCollaboratorId } from "../game/types";

export interface LudodexLegendary {
  id: SpecialCollaboratorId;
  firstName: string;
  lastName: string;
  kind: "standard" | "secret";
  /** Numero fisso del Ludodex (09/10/2026): non dipende dalla posizione nella lista. */
  ludodexNumber: number;
  secretLegendaryId?: SecretLegendaryId;
  /** Non si iscrive mai (Panico, Maggi): la scheda si apre alla prima sconfitta. */
  external?: true;
  initialSchool: string;
  foundAt: string;
  acquisition: string;
}

/**
 * Numeri fissi del Ludodex (approvati il 09/10/2026, nell'ordine di allora):
 * prima i Leggendari, poi i Segreti per torneo. Un nuovo Leggendario prende il
 * primo numero libero in fondo, senza spostare gli altri.
 */
export const LUDODEX_NUMBERS: Record<SpecialCollaboratorId, number> = {
  "andrea-simonazzi": 1,
  "eva-parodi": 2,
  "andrea-ferrari": 3,
  "marco-gabriele-fedozzi": 4,
  "matteo-scarzello": 5,
  "chris-usai": 6,
  "guglielmo-oliveri": 7,
  "niccolo-efrati": 8,
  "marco-palena": 9,
  "lorenzo-todaro": 10,
  "elisa-brondolo": 11,
  "ruggero-pini": 12,
  "adriano-panico": 13,
  "pietro-scarica": 14,
  "piero-dipalo": 15,
  "sara-magnifico": 16,
  "daniele-panizza": 17,
  "marco-brondolo": 18,
  "daniele-maggi": 19,
  "enrico-giovanetti": 20,
  "francesco-d-addosio": 21,
  "jacopo-viola": 22,
  "pierluigi-chimienti": 23,
  "marcello-lovo": 24,
  "simone-pedrazzi": 25,
  "antonio-rocchitelli": 26,
  "ugo-cesare-tonelli": 27,
  "paolo-scalzulli": 28,
  "carlos-jimenez-moyano": 29,
  "debora-girelli": 30,
  "andrea-pini": 31,
  "lorenzo-ferrario": 32,
};

/** «#005»: il numero del Ludodex come lo mostra il gioco. */
export function formatLudodexNumber(legendary: Pick<LudodexLegendary, "ludodexNumber">): string {
  return `#${String(legendary.ludodexNumber).padStart(3, "0")}`;
}

const STANDARD_LUDODEX_LEGENDARIES: LudodexLegendary[] = SPECIAL_COLLABORATORS.map(
  (profile) => ({
    ...profile,
    kind: "standard",
    ludodexNumber: LUDODEX_NUMBERS[profile.id],
    foundAt: profile.id === "andrea-simonazzi"
      ? `${GAME_CONFIG.guaranteedAndreaContactPosition}° contatto della scuola iniziale`
      : "Nuovi contatti, dopo lo sblocco delle rarità avanzate",
    acquisition: "Invia l'email, completa la prova in palestra e ottieni l'iscrizione.",
  }),
);

function getSecretLegendaryDiscovery(id: SecretLegendaryId): Pick<
  LudodexLegendary,
  "initialSchool" | "foundAt" | "acquisition"
> {
  const profile = getSecretLegendaryProfile(id);
  const initialSchool = profile.school.city
    ? `${profile.school.name} · ${profile.school.city}`
    : profile.school.name;
  if (profile.recruitment === "never") {
    return {
      initialSchool,
      foundAt: TOURNAMENT_DEFINITIONS[profile.level].label,
      acquisition: `Non si iscrive mai. Battilo in torneo: ogni sconfitta vale una donazione di ${formatCurrency(profile.defeatRewardEuros ?? 0)} alla scuola.`,
    };
  }
  if (profile.level === "chronicles") {
    return {
      initialSchool,
      foundAt: "Chronicles of Ludosport",
      acquisition: "Vinci una disciplina nelle Chronicles, poi supera la sfida Leggendaria al meglio delle tre.",
    };
  }
  return {
    initialSchool,
    foundAt: TOURNAMENT_DEFINITIONS[profile.level].label,
    acquisition: "Batti il Leggendario nella sua disciplina per sbloccare una prova in palestra. Completala con successo per ottenere l'iscrizione.",
  };
}

const SECRET_LUDODEX_LEGENDARIES: LudodexLegendary[] = SECRET_LEGENDARY_IDS
  .map((id) => ({
    id,
    firstName: SECRET_LEGENDARIES[id].firstName,
    lastName: SECRET_LEGENDARIES[id].lastName,
    kind: "secret",
    ludodexNumber: LUDODEX_NUMBERS[id],
    secretLegendaryId: id,
    ...(getSecretLegendaryProfile(id).recruitment === "never" ? { external: true as const } : {}),
    ...getSecretLegendaryDiscovery(id),
  }));

/**
 * Tutti i Leggendari. Quelli non reclutabili (Panico, Maggi) si scoprono alla
 * prima sconfitta in torneo e non hanno una scena (08/10).
 */
export const LUDODEX_LEGENDARIES: readonly LudodexLegendary[] = [
  ...STANDARD_LUDODEX_LEGENDARIES,
  ...SECRET_LUDODEX_LEGENDARIES,
].sort((a, b) => a.ludodexNumber - b.ludodexNumber);

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
      "La Creatività (ramo degli [[Upgrade]]) alza la probabilità di ottenere la prova fino al massimo della rarità e arricchisce l'aspetto dell'email.",
    ],
    related: ["prove-iscrizioni", "rarita-leggendari", "collaboratori-settori"],
  },
  {
    id: "eventi-attrezzatura",
    group: "Primi passi",
    title: "Eventi e attrezzatura",
    summary: "Contatti, capacità della squadra e consumo delle spade.",
    introduction: "Gli [[Eventi]] trasformano il lavoro della scuola in persone incontrate e nuovi **Contatti**. Quasi tutte le attività usano attrezzatura: l'usura accumulata può rompere le **Spade** e ridurre la capacità operativa.",
    steps: [
      { icon: "flag", label: "Evento", detail: "Scegli un'attività" },
      { icon: "people", label: "Squadra", detail: "Assegna capacità" },
      { icon: "wrench", label: "Usura", detail: "Si accumula a ogni attività" },
      { icon: "contact", label: "Contatti", detail: "Registra gli esiti" },
    ],
    numbers: [
      { label: "Dotazione iniziale", value: `${GAME_CONFIG.initialSwords} spade`, detail: "disponibili nella prima scuola" },
      { label: "Rottura", value: `${GAME_CONFIG.equipmentBreakLoad} usura`, detail: "equivale a una spada rotta" },
      { label: "Riparazione", value: `€ ${GAME_CONFIG.equipmentDamagedSwordRepairCost}`, detail: "per ogni spada già rotta" },
    ],
    rules: [
      "Se l'attrezzatura richiesta non è disponibile, l'attività non può partire.",
      "La manutenzione preventiva converte lavoro e denaro in usura rimossa.",
      "Nuove **Spade** si comprano dal fornitore ufficiale, dopo il potenziamento Fornitore ufficiale (Attrezzatura).",
      "[[Upgrade]] e Collaboratori possono ridurre il consumo o automatizzare le riparazioni.",
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
      { label: "Quota mensile", value: `€ ${GAME_CONFIG.monthlyMemberFee}`, detail: "base iniziale, sale con il record di **Iscritti**" },
    ],
    rules: [
      "Il risultato non è sempre garantito, anche dopo una prova prenotata.",
      "Un'iscrizione [[r:Leggendaria]] rende subito disponibile anche il Collaboratore.",
      "Il bonus di iscrizione è separato dalla quota ricorrente mensile.",
      "La quota è la stessa per tutti: Forme, attestati e qualifiche non la cambiano.",
    ],
    example: {
      title: "Esempio: scuola appena aperta",
      lines: [
        `3 iscritti × € ${GAME_CONFIG.monthlyMemberFee} = € ${3 * GAME_CONFIG.monthlyMemberFee} al mese`,
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
    introduction: "La rarità descrive quanto spesso una persona compare e come affronta il reclutamento. I [[r:Leggendari]] hanno nome e cognome fissi, sono unici e vengono registrati permanentemente nel Ludodex dopo la prima iscrizione.",
    steps: [
      { icon: "contact", label: "Comune", detail: "Frequente" },
      { icon: "trend", label: "Raro", detail: "Più selettivo" },
      { icon: "spark", label: "Ultra Raro", detail: "Corso Y per collaborare" },
      { icon: "book", label: "Leggendario", detail: "Unico e permanente" },
    ],
    numbers: rarityNumbers,
    rules: [
      "Le percentuali di coda indicano la distribuzione base dei nuovi contatti.",
      `Gli [[r:Ultra Rari]] si fanno più rari con la squadra: dal ${percentage(PERSON_RARITIES["ultra-rare"].queueAppearanceChance)} fino a ${GAME_CONFIG.ultraRareDeclineStartCollaborators} collaboratori, poi in calo fino all'${percentage(GAME_CONFIG.ultraRareMinimumAppearanceChance)} con ${GAME_CONFIG.ultraRareFloorCollaborators} collaboratori o più; la differenza va a [[r:Comuni]] e [[r:Rari]].`,
      "I [[r:Leggendari]] diventano Collaboratori appena si iscrivono.",
      "Un [[r:Leggendario]] già iscritto resta nel Ludodex anche se lascia la scuola o ne fondi una nuova.",
    ],
    related: ["prove-iscrizioni", "collaboratori-settori", "tornei"],
  },
  {
    id: "economia-scuola",
    group: "Gestione della scuola",
    title: "Economia della scuola",
    summary: "Entrate una tantum, rette, spese e ritmo dei mesi.",
    introduction: "Gli Euro finanziano Forme, attrezzatura, [[Upgrade]] e attività. Le iscrizioni danno un bonus immediato; le rette arrivano invece al cambio mese e crescono con il numero di **Iscritti**.",
    steps: [
      { icon: "people", label: "Iscritti", detail: "Generano rette" },
      { icon: "coin", label: "Entrate", detail: "Finanziano la scuola" },
      { icon: "spark", label: "Investimenti", detail: "Sbloccano crescita" },
      { icon: "trend", label: "Ritorno", detail: "Aumenta la capacità" },
    ],
    numbers: [
      { label: "Mese di gioco", value: seconds(GAME_CONFIG.gameMonthMs), detail: "tempo attivo di base" },
      { label: "Quota base", value: `€ ${GAME_CONFIG.monthlyMemberFee} → € ${GAME_CONFIG.membershipFeeTiers.at(-1)!.fee}`, detail: "sale con il record di **Iscritti**" },
    ],
    rules: [
      "Le rette considerano soltanto gli iscritti attivi.",
      `La quota base sale quando la scuola raggiunge per la prima volta ${GAME_CONFIG.membershipFeeTiers.map((tier) => `${tier.members} iscritti (€ ${tier.fee})`).join(", ")}; non scende più, anche se qualcuno lascia, e riparte da € ${GAME_CONFIG.monthlyMemberFee} in una nuova scuola.`,
      "La formazione non alza le quote: serve ai tornei, agli Istruttori e alla **Fama**.",
      "**Follower** e scuole fondate aggiungono altre entrate ricorrenti quando i sistemi sono sbloccati.",
    ],
    related: ["forme-corsi", "social", "rete-scuole"],
  },
  {
    id: "upgrade",
    group: "Gestione della scuola",
    title: "Upgrade",
    summary: "Rami pubblici, punti nel ramo, soglie e legami narrativi.",
    introduction: "Gli [[Upgrade]] trasformano risorse in vantaggi permanenti per la scuola corrente. Ogni livello comprato vale un punto nel suo ramo: i nodi più avanzati si aprono quando nel ramo hai speso abbastanza punti, in qualunque nodo.",
    steps: [
      { icon: "coin", label: "Costo", detail: "Verifica gli Euro" },
      { icon: "book", label: "Punti", detail: "Raggiungi la soglia del ramo" },
      { icon: "spark", label: "Acquisto", detail: "Sblocca l'effetto" },
      { icon: "trend", label: "Sinergia", detail: "Combina i rami" },
    ],
    numbers: [
      { label: "Rami pubblici", value: "8", detail: "Scrittura, Creatività, Carisma, Accoglienza, Attrezzatura, Gadget, Insegnamento e Organizzazione" },
      { label: "Punti", value: "1 a livello", detail: "contano nel ramo del nodo comprato" },
      { label: "Prezzo", value: `+${Math.round(UPGRADE_PRICING.branchGrowth * 100)}% a punto`, detail: "per ogni livello già comprato nello stesso ramo" },
      { label: "Sblocco iniziale", value: "1 iscritto", detail: "insieme alla pagina della scuola" },
    ],
    rules: [
      "Un nodo bloccato dice come si apre: i punti che servono nel ramo o il legame che manca.",
      `Ogni livello comprato rende più cari del ${Math.round(UPGRADE_PRICING.branchGrowth * 100)}% tutti i nodi dello stesso ramo; gli altri rami non cambiano. In una nuova scuola gli [[Upgrade]] ripartono da zero e i prezzi tornano quelli di partenza: le cime dei rami si raggiungono scuola dopo scuola, con la **Reputazione**.`,
      "I nodi del [[Network delle Onde]] e i percorsi segreti hanno prezzi fissi.",
      "Pochi nodi hanno un legame narrativo: il Social, un nodo che ne trasforma un altro, punti di un altro ramo.",
      "Creatività resta una catena: ogni nodo è il catalogo email successivo.",
      "Occhio del Maestro decide quando si vedono Arena e Stile; Istruttori in e-Learning fa formare da soli gli Istruttori; Eventi nel Multiverso fa girare più copie dello stesso evento, che costano il doppio e trovano meno **Contatti**.",
      "Calendario fitto accorcia le attese tra gli eventi, Chat di Gruppo trattiene gli iscritti, Porta un amico porta **Contatti**, Progetto Influencer porta **Follower** sicuri, Rhythm Gamer apre prima le rarità dei Gadget, Conto deposito paga interessi sui **Fondi**.",
      "Dalla prima fondazione compare il [[Network delle Onde]]: i suoi nodi si aprono con le scuole fondate (1, 2, 3, 5, 7, 10, 13, 16, 20) e alcuni crescono con il Network.",
      "Il tempo è denaro ([[Network delle Onde]]) fa scegliere la velocità del gioco con il pulsante accanto alla pausa: 2× dal livello 1 (1 scuola fondata), 3× dal livello 2 (3 scuole fondate), 4× dal livello 3 (5 scuole fondate) e 5× dal livello 4 (8 scuole fondate). Accelera tutto ciò che scorre da solo, non la scrittura delle email né i minigiochi; la scelta resta salvata, e in una scuola nuova si torna a 1× finché il nodo non è ricomprato.",
      "Multitasking dà al laboratorio [[Gadget]] un secondo e un terzo banco: i collaudi in più aspettano in coda.",
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
      { label: "Leggendario", value: "×1,5", detail: "moltiplicatore base di produttività" },
      { label: "Ultra Raro", value: "×1", detail: "diventa Collaboratore dopo il Corso Y" },
      { label: "Vista aggregata", value: `${GAME_CONFIG.collaboratorAggregateUnlockCount}`, detail: "Collaboratori per gestire posti e priorità" },
      { label: "Leggenda", value: `+${Math.round(COLLABORATOR_MASTERY_LEVELS.at(-1)!.multiplier * 100)}%`, detail: "dopo due ore nello stesso settore" },
    ],
    rules: [
      "Ogni Collaboratore può avere un incarico operativo principale.",
      `La Maestria cresce con il tempo nello stesso settore: ${COLLABORATOR_MASTERY_LEVELS.slice(1).map((level) => `${level.name} +${Math.round(level.multiplier * 100)}% dopo ${level.minimumXp / 60} minuti`).join(", ")}. Negli [[a:Eventi]] riduce invece durata, costo e usura degli eventi automatici: ${COLLABORATOR_MASTERY_LEVELS.slice(1).map((level) => `${level.name} ${Math.round(level.eventMultiplier * 100)}%`).join(", ")}.`,
      "Le Forme non danno bonus ai Collaboratori: rendono più forti gli atleti in Arena e Stile.",
      "I posti aggregati distribuiscono automaticamente le persone rispettando le priorità.",
      "In una nuova scuola i [[r:Leggendari]] ripartono da zero: restano solo Arena e Stile naturali.",
    ],
    related: ["forme-corsi", "social", "eventi-attrezzatura"],
  },
  {
    id: "forme-corsi",
    group: "Crescita",
    title: "Forme e corsi",
    summary: "Percorso tecnico, rami d'arma e Preparazione nei tornei.",
    introduction: "La formazione aumenta il valore dell'iscritto e apre ruoli avanzati. Ogni Forma e ogni corso aggiungono Arena e Stile usati nei tornei, in qualunque ramo; l'arma del ramo più avanzato decide con che cosa si combatte.",
    steps: [
      { icon: "book", label: "Forma 1", detail: "Inizia il percorso" },
      { icon: "spark", label: "Corsi X e Y", detail: "Aprono nuovi ruoli" },
      { icon: "flag", label: "Ramo d'arma", detail: "Scegli la specialità" },
      { icon: "trophy", label: "Forme 6 e 7", detail: "Completa il percorso" },
    ],
    numbers: [
      { label: "Percorsi disponibili", value: `${FORM_DEFINITIONS.length}`, detail: "Forme e corsi nel catalogo" },
      { label: "Tutte le Forme", value: "+90%", detail: "Arena e Stile; +100% con il Corso X" },
      { label: "F1, F2, F6, F7", value: "+10%", detail: "Arena e Stile ciascuna" },
      { label: "Esperienza torneo", value: "+3%", detail: "per punto, fino a 20" },
    ],
    rules: [
      "Dalla Forma 3 il percorso si divide in Spada Lunga, Staffa e Doppie Spade Corte: ogni Forma vale 10 punti, divisi 5 e 5 con la Lunga, 7,5 in Arena e 2,5 in Stile con la Staffa, 2,5 e 7,5 con le Doppie.",
      "Corso Y aggiunge il 5% in Arena e Stile; il Corso X il 10%, ma solo dopo il suo Percorso Segreto.",
      "Si combatte con l'arma del ramo in cui si è andati più avanti: le tecniche complesse (COM) sono quelle di quell'arma. Forma 1 e 2 si fanno con la Spada Lunga.",
      "La Preparazione combina valore base, Forme ed esperienza nei tornei.",
      "Costi, durata e **Spade** richieste sono mostrati prima di avviare ogni formazione.",
    ],
    related: ["tornei", "collaboratori-settori", "economia-scuola"],
  },
  {
    id: "social",
    group: "Crescita",
    title: "Social",
    summary: "Contenuti, Follower, nuovi contatti e sponsorizzazioni.",
    introduction: "Quando la squadra cresce, la [[a:Redazione]] diventa [[a:Social]]. Il lavoro continua a sostenere le email e in parallelo produce contenuti che possono generare **Follower**, **Contatti** ed entrate ricorrenti.",
    steps: [
      { icon: "people", label: "Collaboratori", detail: "Producono lavoro" },
      { icon: "mail", label: "Email", detail: "Riceve la quota principale" },
      { icon: "spark", label: "Contenuti", detail: "Completano un ciclo" },
      { icon: "trend", label: "Follower", detail: "**Fama** e rendita" },
    ],
    numbers: [
      { label: "Sblocco", value: `${GAME_CONFIG.socialUnlockCollaborators} collaboratori`, detail: "nella scuola" },
      { label: "Ripartizione base", value: "95% / 5%", detail: "email e contenuti mentre si scrive" },
      { label: "Ciclo contenuto", value: `${GAME_CONFIG.socialBaseContentCharacters.toLocaleString("it-IT")} caratteri`, detail: "requisito base" },
    ],
    rules: [
      "Ogni **Follower** aumenta anche la **Fama** della scuola.",
      "I **Follower** migliorano l'affluenza agli [[Eventi]] e alimentano le sponsorizzazioni.",
      "Senza Collaboratori assegnati ai [[a:Social]], l'automazione del settore non avanza.",
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
      { label: "Sblocco", value: `${GAME_CONFIG.formsUnlockMembers} iscritti`, detail: "insieme a Forme e Istruttori" },
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
    introduction: "Il Laboratorio [[Gadget]] converte Produttività in prodotti vendibili. Ogni articolo va acquistato, sviluppato e collaudato prima di entrare nel catalogo.",
    steps: [
      { icon: "coin", label: "Progetto", detail: "Acquista il prodotto" },
      { icon: "wrench", label: "Sviluppo", detail: "Consuma Produttività" },
      { icon: "spark", label: "Qualità", detail: "Completa la prova" },
      { icon: "gift", label: "Vendite", detail: "Partono in automatico" },
    ],
    numbers: [
      { label: "Sblocco", value: "1ª vittoria alla Champion's Arena", detail: "apre il Laboratorio" },
      { label: "Qualità minima utile", value: "> 50%", detail: "può sbloccare una nuova rarità" },
      { label: "Guadagno massimo squadra", value: `€ ${GAME_CONFIG.reptileMaximumGadgetGrossPerTeam.toLocaleString("it-IT")}`, detail: "limite per squadra nel Reptile" },
    ],
    rules: [
      "Senza Collaboratori nel settore, progetti e revisioni non avanzano.",
      "Una qualità migliore aumenta probabilità di vendita e guadagno unitario.",
      "Il Pubblico raggiungibile dipende dagli **Iscritti** e, con gli [[Upgrade]], dai **Follower**.",
    ],
    related: ["collaboratori-settori", "social", "tornei"],
  },
  {
    id: "rete-scuole",
    group: "Crescita",
    title: "Network e nuove scuole",
    summary: "Prestigio, requisiti di fondazione e progressi permanenti.",
    introduction: "Fondare una nuova scuola riavvia il ciclo locale, **Fama** compresa, e ti dà punti **Reputazione**: è l'unico valore che passa da una scuola all'altra. Li spendi alla fondazione in sei potenziamenti permanenti o in una rendita fissa dalla scuola che lasci. La voce [[Network]] compare con il primo titolo all'Accademico e da lì resta.",
    steps: [
      { icon: "trend", label: "Requisiti", detail: "Completa il ciclo" },
      { icon: "trophy", label: "Accademico", detail: "Vinci Arena o Stile" },
      { icon: "people", label: "Fondazione", detail: "Apri una scuola" },
      { icon: "book", label: "Network", detail: "Conserva i progressi" },
    ],
    numbers: [
      { label: "Titoli all'Accademico", value: `${GAME_CONFIG.prestigeAcademyTitles}`, detail: "in Arena o in Stile, con la scuola corrente" },
      { label: "Reputazione", value: "1 + √(Fama/128)", detail: "1 per l'Accademico, +2 per Nazionale, Champion's Arena, Reptile o Superba e Chronicles vinti" },
      { label: "Potenziamenti", value: `+${Math.round(GAME_CONFIG.reputationStep * 100)}% a punto`, detail: `fino a ${GAME_CONFIG.reputationUpgradeMaxLevel} punti ciascuno, mai azzerati` },
      { label: "Rendita", value: `${Math.round(GAME_CONFIG.networkRentPointShare * 100)}% a punto`, detail: "del valore di rendita della scuola lasciata (iscritti × 40 € × 10%)" },
    ],
    rules: [
      "Serve una vittoria al Torneo Accademico, in Arena o in Stile, con la scuola corrente.",
      "Sei rami: Email/Social (caratteri per input, email e contenuti social), Eventi (**Contatti** a ogni evento), Iscrizioni (probabilità dopo la prova), Social e Gadget (entrate dai **follower** e vendite dei gadget), Formazione (corsi di atleti, Istruttori, Tecnici e agonisti), Genetica (valori di base dei nuovi atleti e Preparazione atletica).",
      `La mappa del [[Network]] conserva di ogni scuola solo nome, città e **Fama**; tiene la Sede madre e le ultime ${GAME_CONFIG.networkMapSchoolsLimit - 1}, le più vecchie restano contate.`,
      "La spesa è definitiva. I punti negli Upgrade restano per sempre; quelli nella rendita si consumano: bloccano una rendita fissa dalla scuola che lasci e la scuola successiva riparte da 0%.",
      "La rendita non ha tetto: è dove spendere la **Reputazione** quando gli Upgrade sono al massimo.",
      "L'Accademico apre la fondazione, il Nazionale aggiunge 2 punti di **Reputazione**; vincere più volte lo stesso torneo non aggiunge altro.",
      "Torneo della Superba e Corso X, una volta sbloccati, restano per sempre.",
      "Il Ludodex e i progressi permanenti dei [[r:Leggendari]] non vengono cancellati.",
    ],
    related: ["economia-scuola", "tornei", "rarita-leggendari"],
  },
];
