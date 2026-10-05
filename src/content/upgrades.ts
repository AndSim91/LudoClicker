import type { GadgetProductId, GameState, UpgradeId, UpgradeLevels } from "../game/types";

export type UpgradeCategory =
  | "speed"
  | "writing"
  | "charisma"
  | "welcome"
  | "equipment"
  | "gadget"
  | "instructors"
  | "organization"
  | "secrets"
  | "social";

export type UpgradeEffect =
  | "writingPower"
  | "perfectPhraseChance"
  | "flowMaxMultiplier"
  | "editorialAutomationMultiplier"
  | "emailInitialProgress"
  | "socialCopyShare"
  | "creativityPoint"
  | "eventContactsMultiplier"
  | "eventAttendanceMultiplier"
  | "enrollmentProgress"
  | "trialDurationReductionMs"
  | "instructorEnrollmentEffectiveness"
  | "failedTrialRetryChance"
  | "socialContentTier"
  | "socialFollowerChanceTier"
  | "socialEventPromotionTier"
  | "socialFollowerValueTier"
  | "equipmentWearReduction"
  | "equipmentAutomationMultiplier"
  | "equipmentPreparedWorkCapacity"
  | "equipmentSwordRepairWorkReduction"
  | "automationMultiplier"
  | "masteryExperienceMultiplier"
  | "collaboratorFallbackTier"
  | "membershipIncomeMultiplier"
  | "incomeMultiplier"
  | "operationalPrioritiesUnlock"
  | "officialStatsVisibilityTier"
  | "instructorSelfTrainingTier"
  | "eventCopyCapacity"
  | "officialSwordSupplierUnlock"
  | "annualFormCapacity"
  | "instructorBranchCapacity"
  | "trainingExamSuccessChance"
  | "unrestrictedFormBranches"
  | "instructorStudentCapacity"
  | "instructorTeachingSpeed"
  | "agonistCourseTier"
  | "agonistCourseStatMaximum"
  | "athleticPreparationPower"
  | "sisTechnicianCourseUnlock"
  | "courseCostReduction"
  | "courseXUnlock"
  | "gadgetMemberReachTier"
  | "gadgetFollowerReachTier"
  | "gadgetDevelopmentSpeed"
  | "gadgetRevisionSpeed"
  | "gadgetSalesCapacity"
  | "gadgetSalesConversion"
  | "gadgetCrossSell"
  | "gadgetRarityChanceMultiplier"
  | "socialExtraFollowers"
  | "eventCooldownReduction"
  | "departureRiskReduction"
  | "referralChance"
  | "depositInterestRate"
  | "legacy";

export interface UpgradeDefinition {
  id: UpgradeId;
  category: UpgradeCategory;
  title: string;
  emphasizedTitlePart?: string;
  description: string;
  effectLabel: string;
  effect: UpgradeEffect;
  effectPerLevel: number;
  effectStartingLevel?: number;
  effectLevelCap?: number;
  additionalEffectsPerLevel?: Partial<Record<UpgradeEffect, number>>;
  effectsByLevel?: Array<Partial<Record<UpgradeEffect, number>>>;
  baseCost: number;
  costGrowth: number;
  levelCosts?: number[];
  networkCostGrowth?: number;
  maxLevel: number;
  requiredFame: number;
  requiredUnlocks?: Array<keyof GameState["unlocks"]>;
  /** Levels bought in this node's own branch needed to open it (1 level = 1 point). */
  requiredBranchPoints?: number;
  /** Narrative links to other branches: points needed there. */
  requiredCategoryPoints?: Partial<Record<UpgradeCategory, number>>;
  /** Narrative links only: a node that transforms or follows another one. */
  requiredUpgradeLevels?: Partial<Record<UpgradeId, number>>;
  requiredGadgetProduct?: GadgetProductId;
  requiredNetworkSchools?: number;
  hidden?: boolean;
  secretHint?: string;
}

export const UPGRADE_CATEGORIES: Array<{
  id: UpgradeCategory;
  title: string;
  description: string;
}> = [
  { id: "speed", title: "Scrittura", description: "Rende più rapida la produzione di email e contenuti Social." },
  { id: "writing", title: "Creatività", description: "Migliora i cataloghi email e la probabilità di ottenere una prova." },
  { id: "charisma", title: "Carisma", description: "Migliora pubblico, dimostrazioni e contatti durante gli eventi." },
  { id: "welcome", title: "Accoglienza", description: "Migliora lezioni di prova e conversione in nuovi iscritti." },
  { id: "equipment", title: "Attrezzatura", description: "Apre l'acquisto delle spade, riduce l'usura programmata e automatizza la manutenzione." },
  { id: "gadget", title: "Gadget", description: "Amplia il pubblico e rende più rapidi sviluppo, revisioni e vendite." },
  { id: "instructors", title: "Insegnamento", description: "Sviluppa Istruttori, Tecnici e preparazione agonistica." },
  { id: "organization", title: "Organizzazione", description: "Coordina collaboratori, automazioni ed entrate ricorrenti." },
  { id: "secrets", title: "Percorsi Segreti", description: "Alcuni percorsi si rivelano soltanto compiendo imprese particolari." },
];

const LEVEL_GROWTH = 1;
const noFame = 0;

const UPGRADE_CATALOG: UpgradeDefinition[] = [
  // Scrittura
  { id: "comfortable-keyboard", category: "speed", title: "Tastiera comoda", description: "Tasti morbidi, ogni pressione rende di più. E finalmente niente briciole tra la G e la H.", effectLabel: "Ogni livello: +0,2 caratteri a ogni tasto · Livello 5: +1 · Con Frasi fatte, anche +0,15% di Frase perfetta a livello", effect: "writingPower", effectPerLevel: 0.2, additionalEffectsPerLevel: { perfectPhraseChance: 0.0015 }, baseCost: 50, costGrowth: LEVEL_GROWTH, levelCosts: [50, 100, 200, 400, 800], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 0 },
  { id: "writing-rhythm", category: "speed", title: "Ritmo di battitura", description: "Se non ti fermi entri nel Flusso, e ogni tasto vale di più. Alzarsi per il caffè diventa un rischio calcolato.", effectLabel: "Livello 1: sblocca il Flusso, che fa valere i tasti fino al doppio · Ogni livello in più: il tetto sale di uno · Livello 4: fino a ×5", effect: "flowMaxMultiplier", effectPerLevel: 1, baseCost: 100, costGrowth: LEVEL_GROWTH, levelCosts: [100, 250, 600, 1_500], maxLevel: 4, requiredFame: noFame, requiredBranchPoints: 2 },
  { id: "quick-phrases", category: "speed", title: "Frasi rapide", description: "Le formule di sempre si scrivono da sole. Il cervello, nel frattempo, può pensare alla cena.", effectLabel: "Ogni livello: +0,4 caratteri a ogni tasto · Livello 5: +2 · Con Frasi fatte, anche +0,15% di Frase perfetta a livello", effect: "writingPower", effectPerLevel: 0.4, additionalEffectsPerLevel: { perfectPhraseChance: 0.0015 }, baseCost: 150, costGrowth: LEVEL_GROWTH, levelCosts: [150, 300, 600, 1_200, 2_400], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 2 },
  { id: "stock-phrases", category: "speed", title: "Frasi fatte", description: "Certe frasi escono perfette al primo colpo. Nessuno sa come, nessuno chiede.", effectLabel: "Livello 1: sblocca la Frase perfetta, che chiude la frase in corso in un colpo · Ogni livello: +0,25% di probabilità · Con gli altri nodi di Scrittura arriva fino al 5%", effect: "perfectPhraseChance", effectPerLevel: 0.0025, baseCost: 400, costGrowth: LEVEL_GROWTH, levelCosts: [400, 800, 1_600, 3_200, 6_400], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 3 },
  { id: "automatic-signature", category: "speed", title: "Firma automatica", description: "Saluti, firma e recapiti in fondo a ogni email, senza toccare un tasto. La Redazione ringrazia e accelera.", effectLabel: "Ogni livello: Redazione e Social lavorano il 10% più in fretta · Livello 5: +50%", effect: "editorialAutomationMultiplier", effectPerLevel: 0.1, baseCost: 300, costGrowth: LEVEL_GROWTH, levelCosts: [300, 600, 1_200, 2_400, 4_800], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 4 },
  { id: "smart-fields", category: "speed", title: "Campi intelligenti", description: "Nome, luogo e orario si compilano da soli. Ogni email nuova parte già avviata, come chi arriva in palestra già cambiato.", effectLabel: "Ogni livello: ogni nuova email parte già scritta al 5% · Livello 5: al 25% · Con Frasi fatte, anche +0,15% di Frase perfetta a livello", effect: "emailInitialProgress", effectPerLevel: 0.05, additionalEffectsPerLevel: { perfectPhraseChance: 0.0015 }, baseCost: 600, costGrowth: LEVEL_GROWTH, levelCosts: [600, 1_200, 2_400, 4_800, 9_600], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 6 },
  { id: "social-content-synthesis", category: "speed", title: "Sintesi dei contenuti", description: "Un post non deve per forza essere un romanzo. Meno parole, stessi like.", effectLabel: "Ogni livello: 10.000 caratteri in meno per pubblicare un contenuto Social · da 100.000 a 50.000 al livello 5", effect: "socialContentTier", effectPerLevel: 1, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 20_000, 40_000], maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["social"], requiredBranchPoints: 9 },
  { id: "instant-review", category: "speed", title: "Revisione istantanea", description: "Qualcuno rilegge mentre scrivi. I refusi non arrivano neanche al secondo paragrafo.", effectLabel: "Ogni livello: Redazione e Social lavorano il 15% più in fretta · Livello 5: +75% · Con Frasi fatte, anche +0,3% di Frase perfetta a livello", effect: "editorialAutomationMultiplier", effectPerLevel: 0.15, additionalEffectsPerLevel: { perfectPhraseChance: 0.003 }, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 20_000, 40_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 11 },
  { id: "mail-merge", category: "speed", title: "Fusione documenti", description: "Un pezzo di ogni email finisce anche sui Social. Scrivi una volta, pubblichi due: il sogno di ogni Redazione.", effectLabel: "Ogni livello: il 5% del lavoro sulle email fa avanzare anche i contenuti Social, senza rallentare l'email · Livello 5: il 25%", effect: "socialCopyShare", effectPerLevel: 0.05, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000, 50_000, 100_000, 200_000, 400_000], maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["social"], requiredBranchPoints: 25 },

  // Creatività
  { id: "spell-check", category: "writing", title: "Controllo ortografico", description: "Addio refusi e «qual'è». L'email resta la stessa, ma ora si può mandare senza arrossire.", effectLabel: "Livello 1: email nuove nel catalogo · Ogni livello: +1 punto Creatività, cioè più contatti che prenotano la prova dopo l'email", effect: "creativityPoint", effectPerLevel: 1, baseCost: 50, costGrowth: LEVEL_GROWTH, levelCosts: [50, 100, 200, 400, 800], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 0 },
  { id: "professional-email", category: "writing", title: "Email professionale", description: "Paragrafi, firma e spazi al posto giusto. Ancora niente HTML, ma almeno sembra scritta da un adulto.", effectLabel: "Livello 1: email nuove nel catalogo · Ogni livello: +1 punto Creatività (più prove prenotate)", effect: "creativityPoint", effectPerLevel: 1, baseCost: 100, costGrowth: LEVEL_GROWTH, levelCosts: [100, 200, 400, 800, 1_600], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 5 },
  { id: "personalized-invite", category: "writing", title: "Invito personalizzato", description: "Arriva l'HTML: colori, titoli, un'impaginazione vera. Chi la riceve si sente invitato, non spammato.", effectLabel: "Livello 1: arrivano le email HTML · Ogni livello: +1 punto Creatività (più prove prenotate)", effect: "creativityPoint", effectPerLevel: 1, baseCost: 150, costGrowth: LEVEL_GROWTH, levelCosts: [150, 300, 600, 1_200, 2_400], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 10 },
  { id: "call-to-action", category: "writing", title: "Call to action", description: "Un pulsante grande con scritto «Prova gratis». Cliccarlo è più facile che ignorarlo.", effectLabel: "Livello 1: email nuove nel catalogo · Ogni livello: +1 punto Creatività (più prove prenotate)", effect: "creativityPoint", effectPerLevel: 1, baseCost: 300, costGrowth: LEVEL_GROWTH, levelCosts: [300, 600, 1_200, 2_400, 4_800], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 15 },
  { id: "email-layout", category: "writing", title: "Impaginazione", description: "Logo in alto, foto al centro, orari in fondo. Finalmente l'occhio sa dove guardare.", effectLabel: "Livello 1: email nuove nel catalogo · Ogni livello: +1 punto Creatività (più prove prenotate)", effect: "creativityPoint", effectPerLevel: 1, baseCost: 600, costGrowth: LEVEL_GROWTH, levelCosts: [600, 1_200, 2_400, 4_800, 9_600], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 20 },
  { id: "winning-advertising", category: "writing", title: "Pubblicità vincente", description: "L'email diventa un volantino completo, e funziona anche sui Social. I follower arrivano, a volte persino in coppia.", effectLabel: "Ogni livello: +1 punto Creatività · Probabilità che un contenuto Social porti un follower: 50% senza il nodo, poi 60% · 70% · 80% · 90% · 95% · Livello 5: il 5% dei follower arriva in coppia", effect: "creativityPoint", effectPerLevel: 1, additionalEffectsPerLevel: { socialFollowerChanceTier: 1 }, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 25 },
  { id: "marketing-course", category: "writing", title: "Corso di Marketing", description: "Qualcuno ha seguito un corso, e si vede: l'email spiega lo sport per bene. E ogni follower ora vale qualche centesimo in più.", effectLabel: "Ogni livello: +1 punto Creatività · Ogni follower rende al mese 0,10 € senza il nodo, poi 0,15 € · 0,20 € · 0,30 € · 0,40 € · 0,50 €", effect: "creativityPoint", effectPerLevel: 1, additionalEffectsPerLevel: { socialFollowerValueTier: 1 }, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 30 },
  { id: "influencer-project", category: "writing", title: "Progetto Influencer", description: "Ring light, sorriso e un balletto che nessuno aveva chiesto. I follower, però, arrivano.", effectLabel: "Ogni livello: +1 follower sicuro per ogni contenuto Social · Livello 5: +5", effect: "socialExtraFollowers", effectPerLevel: 1, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000, 50_000, 100_000, 200_000, 400_000], maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["social"], requiredBranchPoints: 35 },

  // Carisma
  { id: "prepared-presentation", category: "charisma", title: "Presentazione preparata", description: "Tre frasi provate davanti allo specchio, per spiegare LudoSport in trenta secondi. Lo specchio non si è iscritto, i passanti sì.", effectLabel: "Ogni livello: +4% contatti a ogni evento · Livello 5: +20%", effect: "eventContactsMultiplier", effectPerLevel: 0.04, baseCost: 50, costGrowth: LEVEL_GROWTH, levelCosts: [50, 100, 200, 400, 800], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 0 },
  { id: "qr-cards", category: "charisma", title: "Biglietti con QR code", description: "Un quadratino stampato e l'indirizzo è già lì. Nessuno deve più dettare «punto, trattino basso, due».", effectLabel: "Ogni livello: +4% contatti a ogni evento · Livello 5: +20%", effect: "eventContactsMultiplier", effectPerLevel: 0.04, baseCost: 100, costGrowth: LEVEL_GROWTH, levelCosts: [100, 200, 400, 800, 1_600], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 3 },
  { id: "coordinated-demo", category: "charisma", title: "Dimostrazione coordinata", description: "Due atleti, una coreografia provata, nessun ginocchio sbucciato. Il pubblico resta fino alla fine.", effectLabel: "Ogni livello: +5% pubblico a ogni evento · Livello 5: +25%", effect: "eventAttendanceMultiplier", effectPerLevel: 0.05, baseCost: 150, costGrowth: LEVEL_GROWTH, levelCosts: [150, 300, 600, 1_200, 2_400], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 8 },
  { id: "recognizable-stand", category: "charisma", title: "Stand riconoscibile", description: "Bandiera alta, striscione luminoso, spade in vista. Ci trovano anche senza chiedere al punto informazioni.", effectLabel: "Ogni livello: +7% pubblico a ogni evento · Livello 5: +35%", effect: "eventAttendanceMultiplier", effectPerLevel: 0.07, baseCost: 300, costGrowth: LEVEL_GROWTH, levelCosts: [300, 600, 1_200, 2_400, 4_800], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 13 },
  { id: "event-multiverse", category: "charisma", title: "Eventi nel Multiverso", description: "Lo stesso evento in più universi paralleli. Il pubblico non nota la differenza, il tesoriere sì.", effectLabel: "Livello 1: lo stesso evento può girare in 2 copie insieme · Livello 2: in 3 · Ogni copia costa il doppio della precedente e trova meno contatti (−25%, poi −50%)", effect: "eventCopyCapacity", effectPerLevel: 1, baseCost: 4_000, costGrowth: LEVEL_GROWTH, levelCosts: [4_000, 20_000], maxLevel: 2, requiredFame: noFame, requiredBranchPoints: 15 },
  { id: "demo-set", category: "charisma", title: "Set da dimostrazione", description: "Spade riservate alle dimostrazioni, sempre accese e mai rotte. Le vedono anche dal fondo della piazza.", effectLabel: "Ogni livello: +6% pubblico a ogni evento · Livello 5: +30%", effect: "eventAttendanceMultiplier", effectPerLevel: 0.06, baseCost: 600, costGrowth: LEVEL_GROWTH, levelCosts: [600, 1_200, 2_400, 4_800, 9_600], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 18 },
  { id: "difficult-questions", category: "charisma", title: "Risposte alle domande difficili", description: "«Ma fa male?» «Quanto costa?» «Serve essere in forma?» Ormai c'è una risposta pronta per tutto. Quasi.", effectLabel: "Ogni livello: +6% contatti a ogni evento · Livello 5: +30%", effect: "eventContactsMultiplier", effectPerLevel: 0.06, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 23 },
  { id: "not-that-thing", category: "charisma", title: "No, non è esattamente quella cosa", description: "La risposta definitiva alla domanda che fanno tutti. Detta con un sorriso, per la millesima volta.", effectLabel: "Ogni livello: +8% contatti a ogni evento · Livello 5: +40%", effect: "eventContactsMultiplier", effectPerLevel: 0.08, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 30 },
  { id: "busy-calendar", category: "charisma", title: "Calendario fitto", description: "Tra un evento e l'altro c'è giusto il tempo di ricaricare le spade. E il telefono.", effectLabel: "Ogni livello: −10% di attesa prima di poter ripetere un evento · Livello 5: −50%", effect: "eventCooldownReduction", effectPerLevel: 0.1, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000, 50_000, 100_000, 200_000, 400_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 33 },

  // Accoglienza
  { id: "welcome-procedure", category: "welcome", title: "Procedura di benvenuto", description: "Qualcuno aspetta all'ingresso, mostra lo spogliatoio e presta una spada. La prima lezione fa meno paura.", effectLabel: "Ogni livello: +1% di probabilità che chi fa la prova si iscriva · Livello 5: +5%", effect: "enrollmentProgress", effectPerLevel: 0.01, baseCost: 50, costGrowth: LEVEL_GROWTH, levelCosts: [50, 100, 200, 400, 800], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 0 },
  { id: "clear-material", category: "welcome", title: "Materiale informativo chiaro", description: "Orari, costi e percorso spiegati in un foglio solo. A prova di JarJar.", effectLabel: "Ogni livello: +1,5% di probabilità che chi fa la prova si iscriva · Livello 5: +7,5%", effect: "enrollmentProgress", effectPerLevel: 0.015, baseCost: 150, costGrowth: LEVEL_GROWTH, levelCosts: [150, 300, 600, 1_200, 2_400], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 3 },
  { id: "tested-intro", category: "welcome", title: "Lezione introduttiva collaudata", description: "Sempre la stessa lezione, rifinita a ogni prova. La prima croce viene bene a tutti.", effectLabel: "Ogni livello: +2% di probabilità che chi fa la prova si iscriva · Livello 5: +10%", effect: "enrollmentProgress", effectPerLevel: 0.02, baseCost: 300, costGrowth: LEVEL_GROWTH, levelCosts: [300, 600, 1_200, 2_400, 4_800], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 8 },
  { id: "prepared-room", category: "welcome", title: "Sala preparata", description: "Uniformi lavate e stirate, spade in fila, luci accese prima di cominciare. Chi entra si sente atteso, e la prova scorre più in fretta.", effectLabel: "Ogni livello: +2,5% di probabilità di iscrizione e la prova dura 1 secondo in meno (mai sotto i 10) · Livello 5: +12,5%", effect: "enrollmentProgress", effectPerLevel: 0.025, additionalEffectsPerLevel: { trialDurationReductionMs: 1_000 }, baseCost: 600, costGrowth: LEVEL_GROWTH, levelCosts: [600, 1_200, 2_400, 4_800, 9_600], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 13 },
  { id: "group-chat", category: "welcome", title: "Chat di Gruppo", description: "Promemoria, foto dell'allenamento e trecento buongiorno al giorno. Chi è nel gruppo, a fine anno rinnova.", effectLabel: "Ogni livello: −10% di probabilità che un iscritto non rinnovi a fine anno · Livello 5: −50%", effect: "departureRiskReduction", effectPerLevel: 0.1, baseCost: 3_000, costGrowth: LEVEL_GROWTH, levelCosts: [3_000, 6_000, 12_000, 24_000, 48_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 16 },
  { id: "dedicated-helper", category: "welcome", title: "Collaboratore dedicato", description: "Un allievo esperto si mette accanto a ogni nuovo arrivato. L'Istruttore insegna meglio, e nessuno resta in fondo alla sala a guardarsi le scarpe.", effectLabel: "Ogni livello: +3% di probabilità di iscrizione e Istruttori il 10% più efficaci nel convincere chi prova · Livello 5: +15% e +50%", effect: "enrollmentProgress", effectPerLevel: 0.03, additionalEffectsPerLevel: { instructorEnrollmentEffectiveness: 0.1 }, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 20_000, 40_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 18 },
  { id: "order-welcome", category: "welcome", title: "Accoglienza dell'Ordine", description: "Due chiacchiere sul porkside dopo la lezione. Nessuno sa spiegare bene perché funzioni, ma funziona.", effectLabel: "Ogni livello: +4% di probabilità che chi fa la prova si iscriva · Livello 5: +20%", effect: "enrollmentProgress", effectPerLevel: 0.04, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 23 },
  { id: "memorable-experience", category: "welcome", title: "Esperienza memorabile", description: "Alla prima lezione si insegna un pezzo della Settima. Chi prova non se lo scorda, e chi guarda dalle altre classi chiede quando tocca a lui.", effectLabel: "Ogni livello: +6% di probabilità di iscrizione e +5% che dalla prova arrivi un contatto in più · Livello 5: +30% e +25%", effect: "enrollmentProgress", effectPerLevel: 0.06, additionalEffectsPerLevel: { failedTrialRetryChance: 0.05 }, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 28, requiredCategoryPoints: { instructors: 10 } },
  { id: "bring-a-friend", category: "welcome", title: "Porta un amico", description: "La prova è gratis anche per l'amico. L'amico, di solito, non lo sapeva.", effectLabel: "Ogni livello: +3% di probabilità che un nuovo iscritto porti un amico tra i contatti · Livello 5: 15%", effect: "referralChance", effectPerLevel: 0.03, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000, 50_000, 100_000, 200_000, 400_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 33 },

  // Attrezzatura
  { id: "official-supplier", category: "equipment", title: "Fornitore ufficiale", description: "Un conto aperto con Lama di Luce: le spade nuove arrivano quando servono. Il listino, purtroppo, arriva insieme a loro.", effectLabel: "Sblocca l'acquisto delle spade", effect: "officialSwordSupplierUnlock", effectPerLevel: 1, baseCost: 500, costGrowth: LEVEL_GROWTH, levelCosts: [500], maxLevel: 1, requiredFame: noFame, requiredBranchPoints: 0 },
  { id: "pre-event-check", category: "equipment", title: "Controllo prima dell'uso", description: "Uno sguardo a lame, else e batterie prima di uscire. Meglio accorgersene in palestra che a metà dimostrazione.", effectLabel: "Ogni livello: le spade si consumano il 2% in meno in eventi e corsi · Livello 5: −10%", effect: "equipmentWearReduction", effectPerLevel: 0.02, baseCost: 100, costGrowth: LEVEL_GROWTH, levelCosts: [100, 200, 400, 800, 1_600], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 0 },
  { id: "maintenance-kit", category: "equipment", title: "Kit di manutenzione", description: "Cacciaviti, saldatore e nastro isolante nella stessa cassetta. Le riparazioni vanno più veloci, e nessuno usa più le chiavi di casa.", effectLabel: "Ogni livello: i collaboratori dell'Attrezzatura riparano il 10% più in fretta · Livello 5: +50%", effect: "equipmentAutomationMultiplier", effectPerLevel: 0.1, baseCost: 250, costGrowth: LEVEL_GROWTH, levelCosts: [250, 500, 1_000, 2_000, 4_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 4 },
  { id: "organized-rack", category: "equipment", title: "Banco da lavoro", description: "Un banco tutto per le spade. Nei momenti morti i collaboratori preparano i pezzi, così al prossimo guasto mezzo lavoro è già fatto.", effectLabel: "Nei momenti morti l'Attrezzatura mette da parte lavoro pronto per i guasti · Ogni livello: la scorta può arrivare al 2% dell'usura massima delle spade · Livello 5: al 10%", effect: "equipmentPreparedWorkCapacity", effectPerLevel: 0.02, baseCost: 500, costGrowth: LEVEL_GROWTH, levelCosts: [500, 750, 1_000, 1_500, 2_500], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 9 },
  { id: "essential-parts", category: "equipment", title: "Ricambi essenziali", description: "Interruttori, molle e batterie di scorta nel cassetto. Una spada rotta torna in sala in metà del tempo.", effectLabel: "Ogni livello: 15 punti di lavoro in meno per riparare una spada rotta · da 150 a 75 al livello 5", effect: "equipmentSwordRepairWorkReduction", effectPerLevel: 15, baseCost: 1_000, costGrowth: LEVEL_GROWTH, levelCosts: [1_000, 2_000, 4_000, 8_000, 16_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 13 },
  { id: "checklist", category: "equipment", title: "Lista di controllo", description: "Una lista appesa al muro: cosa si controlla, quando e chi lo fa. Le spade si consumano meno, e le discussioni pure.", effectLabel: "Ogni livello: le spade si consumano il 4% in meno in eventi e corsi · Livello 5: −20%", effect: "equipmentWearReduction", effectPerLevel: 0.04, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 20_000, 40_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 18 },
  { id: "equipment-register", category: "equipment", title: "Registro dell'attrezzatura", description: "Ogni spada ha la sua scheda: guasti, riparazioni, chi l'ha usata per ultimo. Il colpevole, adesso, ha un nome.", effectLabel: "Ogni livello: i collaboratori dell'Attrezzatura riparano il 10% più in fretta · Livello 5: +50%", effect: "equipmentAutomationMultiplier", effectPerLevel: 0.1, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 23 },
  { id: "all-fixed", category: "equipment", title: "Le abbiamo messe a posto tutte", description: "Una frase detta tante volte. Stavolta è vera.", effectLabel: "Ogni livello: le spade si consumano il 4% in meno in eventi e corsi · Livello 5: −20%", effect: "equipmentWearReduction", effectPerLevel: 0.04, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 28, requiredUpgradeLevels: { "official-supplier": 1, "pre-event-check": 1, "maintenance-kit": 1, "organized-rack": 1, "essential-parts": 1, "checklist": 1, "equipment-register": 1 } },

  // Gadget
  { id: "gadget-showcase", category: "gadget", title: "Vetrina della scuola", description: "Una teca all'ingresso con magliette, toppe e portachiavi. Prima o poi tutti gli iscritti ci passano davanti, e qualcuno si ferma.", effectLabel: "Quota degli iscritti che vede il catalogo: 10% · 20% · 35% · 50% · 75% · 100% al livello 5", effect: "gadgetMemberReachTier", effectPerLevel: 1, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 25_000, 50_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredBranchPoints: 0 },
  { id: "gadget-design-tools", category: "gadget", title: "Strumenti di progettazione", description: "Un programma di disegno e qualche ora di stampante 3D. Il primo prototipo arriva prima, e somiglia di più al disegno.", effectLabel: "Ogni livello: il primo prototipo si sviluppa il 20% più in fretta · Livello 5: +100%, cioè in metà tempo", effect: "gadgetDevelopmentSpeed", effectPerLevel: 0.2, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredBranchPoints: 0 },
  { id: "gadget-order-management", category: "gadget", title: "Gestione degli ordini", description: "Un foglio di calcolo al posto dei post-it. Ogni mese si seguono più ordini, e se ne perdono meno.", effectLabel: "Ogni livello: +20% di proposte di vendita gestite ogni mese · Livello 5: il doppio", effect: "gadgetSalesCapacity", effectPerLevel: 0.2, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 20_000, 40_000, 80_000, 160_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredBranchPoints: 2 },
  { id: "gadget-revision-lab", category: "gadget", title: "Laboratorio revisioni", description: "Un angolo dove smontare, correggere e riprovare. Il secondo tentativo arriva prima, e il terzo, se serve, ancora prima.", effectLabel: "Ogni livello: le revisioni si preparano il 20% più in fretta · Livello 5: +100%, cioè in metà tempo", effect: "gadgetRevisionSpeed", effectPerLevel: 0.2, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredBranchPoints: 3 },
  { id: "gadget-online-store", category: "gadget", title: "Negozio online", description: "Il catalogo arriva anche ai follower, che comprano dal divano. Non serve neanche venire in palestra, purtroppo.", effectLabel: "Quota dei follower che vede il catalogo: 1% · 3% · 5% · 10% · 20% · 35% · 50% · 75% · 100% al livello 9", effect: "gadgetFollowerReachTier", effectPerLevel: 1, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 25_000, 50_000, 100_000, 200_000, 400_000, 800_000, 1_600_000], networkCostGrowth: 0, maxLevel: 9, requiredFame: noFame, requiredUnlocks: ["gadget", "social"], requiredBranchPoints: 3 },
  { id: "rhythm-gamer", category: "gadget", title: "Rhythm Gamer", description: "Anni di giochi musicali, finalmente messi a bilancio. Il collaudo va a tempo.", effectLabel: "Ogni livello: +20% di probabilità di aprire la rarità successiva dopo il collaudo · Livello 5: il doppio", effect: "gadgetRarityChanceMultiplier", effectPerLevel: 0.2, baseCost: 7_500, costGrowth: LEVEL_GROWTH, levelCosts: [7_500, 15_000, 30_000, 60_000, 120_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredBranchPoints: 5 },
  { id: "gadget-sales-training", category: "gadget", title: "Formazione commerciale", description: "I collaboratori imparano a proporre senza insistere. Chi era indeciso, alla fine, compra.", effectLabel: "Ogni livello: su 100 proposte, 2 vendite in più · Livello 5: 10 in più", effect: "gadgetSalesConversion", effectPerLevel: 0.02, baseCost: 15_000, costGrowth: LEVEL_GROWTH, levelCosts: [15_000, 30_000, 60_000, 120_000, 240_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredBranchPoints: 8 },
  { id: "gadget-cross-selling", category: "gadget", title: "Vendita abbinata", description: "«Con la maglietta, la toppa è a metà prezzo.» Ogni tanto un ordine se ne porta dietro un altro.", effectLabel: "Ogni livello: +5% di probabilità che una vendita ne porti un'altra, di un altro gadget · Livello 5: 25%", effect: "gadgetCrossSell", effectPerLevel: 0.05, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000, 50_000, 100_000, 200_000, 400_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredGadgetProduct: "mug", requiredBranchPoints: 12 },

  // Insegnamento
  { id: "talent-eye", category: "instructors", title: "Occhio del Maestro", description: "Certi talenti si riconoscono da come impugnano la spada. Altri da come la fanno cadere.", effectLabel: "Senza il nodo Arena e Stile degli atleti restano «?» · Livello 1: si vedono dopo il Corso Y · Livello 2: si vedono dall'iscrizione", effect: "officialStatsVisibilityTier", effectPerLevel: 1, baseCost: 1_000, costGrowth: LEVEL_GROWTH, levelCosts: [1_000, 10_000], networkCostGrowth: 0, maxLevel: 2, requiredFame: noFame, requiredBranchPoints: 0 },
  { id: "technical-arena", category: "instructors", title: "Percorso Tecnico", description: "Sblocca Arena Tecnica, il primo passo per chi vuole combattere sul serio. Ogni livello la rende più breve, non più facile.", effectLabel: "Livello 1: apre il corso Arena Tecnica (120 secondi) · Ogni livello in più: 20 secondi in meno · Livello 5: 40 secondi", effect: "agonistCourseTier", effectPerLevel: 1, baseCost: 1_000, costGrowth: LEVEL_GROWTH, levelCosts: [1_000, 2_000, 5_000, 7_500, 10_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 0 },
  {
    id: "instructor-versatility",
    category: "instructors",
    title: "Master of none",
    description: "Istruttori che sanno un po' di tutto, ed è proprio questo il punto. Più rami a testa, più promossi ai corsi e, alla fine, scelta libera dopo il Corso Y.",
    effectLabel: "Livelli 1–2: ogni Istruttore può insegnare un ramo in più · Livello 3: +10 punti percentuali di promossi ai corsi · Livello 4: +20 · Livello 5: dopo il Corso Y si scelgono tutti i rami",
    effect: "instructorBranchCapacity",
    effectPerLevel: 0,
    effectsByLevel: [
      { instructorBranchCapacity: 1 },
      { instructorBranchCapacity: 1 },
      { trainingExamSuccessChance: 0.1 },
      { trainingExamSuccessChance: 0.1 },
      { unrestrictedFormBranches: 1 },
    ],
    baseCost: 2_000,
    costGrowth: LEVEL_GROWTH,
    levelCosts: [2_000, 4_000, 8_000, 16_000, 32_000],
    networkCostGrowth: 0,
    maxLevel: 5,
    requiredFame: noFame,
    requiredBranchPoints: 1,
  },
  { id: "e-learning", category: "instructors", title: "Istruttori in e-Learning", description: "Il corso è registrato e gli Istruttori lo seguono da soli. Le domande si fanno nei commenti.", effectLabel: "Gli Istruttori si iscrivono da soli al corso da Istruttore, quando ci sono i soldi · Livello 1: Forma 1 · Livello 2: anche Forma 2 (e Corso X, se l'hai) · Livello 3: anche Corso Y", effect: "instructorSelfTrainingTier", effectPerLevel: 1, baseCost: 1_500, costGrowth: LEVEL_GROWTH, levelCosts: [1_500, 6_000, 20_000], networkCostGrowth: 0, maxLevel: 3, requiredFame: noFame, requiredUnlocks: ["forms"], requiredBranchPoints: 3 },
  { id: "sis-accreditation", category: "instructors", title: "Tu conosci la SIS?", description: "Si aprono le candidature alla Scuola Internazionale Superiore. I Corsi Tecnici vanno più veloci, e la domanda del titolo trova finalmente risposta.", effectLabel: "Livello 1: apre i Corsi Tecnici della SIS · Livello 2: corsi il 10% più veloci · Livello 3: +20% · Livello 4: +30%", effect: "sisTechnicianCourseUnlock", effectPerLevel: 1, effectLevelCap: 1, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000], networkCostGrowth: 0, maxLevel: 4, requiredFame: noFame, requiredBranchPoints: 9 },
  { id: "cost-of-service", category: "instructors", title: "Il costo del Servizio", description: "Attestati da Istruttore e qualifiche da Tecnico costano un po' meno. Il Servizio resta impagabile, ma almeno la quota scende.", effectLabel: "Ogni livello: corsi per Istruttori e Tecnici il 5% più economici · Livello 5: −25%", effect: "courseCostReduction", effectPerLevel: 0.05, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 25_000, 50_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 10 },
  { id: "promiscuous-instructor", category: "instructors", title: "Didattica di gruppo", description: "Un Istruttore, fino a sei allievi alla volta. All'ultimo livello avanza tempo per un secondo corso nello stesso anno.", effectLabel: "Ogni livello fino al 5: un allievo in più per Istruttore, da 2 a 6 · Livello 6: un corso in più all'anno per ogni persona", effect: "instructorStudentCapacity", effectPerLevel: 1, effectLevelCap: 5, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000, 400_000], networkCostGrowth: 0, maxLevel: 6, requiredFame: noFame, requiredBranchPoints: 12 },
  {
    id: "agonist-course-intensity",
    category: "instructors",
    title: "Nessun Rancore",
    emphasizedTitlePart: "Rancor",
    description: "Arena Tecnica diventa Corso Agonisti, poi arriva la Preparazione agonistica. Si combatte più forte, e a fine assalto ci si stringe la mano.",
    effectLabel: "Livello 1: Arena Tecnica diventa Corso Agonisti (1.000 €, 60 secondi) · Livelli 2–4: il corso può dare fino a +4 in Arena e Stile · Livello 5: apre la Preparazione agonistica · Livelli 6–10: Preparazione il 10% più efficace a livello · Livello 10: anche fino a +5 in Arena e Stile",
    effect: "agonistCourseStatMaximum",
    effectPerLevel: 0,
    effectsByLevel: [
      {},
      { agonistCourseStatMaximum: 1 },
      { agonistCourseStatMaximum: 1 },
      { agonistCourseStatMaximum: 1 },
      {},
      { athleticPreparationPower: 0.1 },
      { athleticPreparationPower: 0.1 },
      { athleticPreparationPower: 0.1 },
      { athleticPreparationPower: 0.1 },
      { agonistCourseStatMaximum: 1, athleticPreparationPower: 0.1 },
    ],
    baseCost: 25_000,
    costGrowth: LEVEL_GROWTH,
    levelCosts: [
      25_000,
      50_000,
      100_000,
      200_000,
      400_000,
      800_000,
      1_600_000,
      3_200_000,
      6_400_000,
      12_800_000,
    ],
    networkCostGrowth: 0,
    maxLevel: 10,
    requiredFame: noFame,
    requiredBranchPoints: 28,
    requiredUpgradeLevels: { "technical-arena": 3 },
  },
  { id: "pagosport", category: "instructors", title: "PagoSport", description: "Un piano formativo più ampio, un corso in più all'anno e tutto più veloce. Il nome lo dice: non è gratis.", effectLabel: "Livello 1: un corso in più all'anno per ogni persona · Livello 2: Corsi Tecnici il 50% più veloci · Livello 3: tutti i corsi il 50% più veloci", effect: "annualFormCapacity", effectPerLevel: 1, effectLevelCap: 1, baseCost: 100_000, costGrowth: LEVEL_GROWTH, levelCosts: [100_000, 200_000, 400_000], networkCostGrowth: 0, maxLevel: 3, requiredFame: noFame, requiredBranchPoints: 38 },

  // Organizzazione
  { id: "shared-calendar", category: "organization", title: "Manuale operativo", description: "Tutto quello che si impara, scritto in un manuale. I collaboratori crescono più in fretta, e nessuno deve rispiegare tutto da capo.", effectLabel: "Ogni livello: i collaboratori guadagnano Maestria il 10% più in fretta · Livello 5: +50%", effect: "masteryExperienceMultiplier", effectPerLevel: 0.1, baseCost: 500, costGrowth: LEVEL_GROWTH, levelCosts: [500, 1_000, 2_000, 4_000, 8_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 0 },
  { id: "collaborator-shifts", category: "organization", title: "Turni dei collaboratori", description: "Chi resta fermo dà una mano al primo settore della fila che sta lavorando. Le mani in mano, da oggi, sono fuori moda.", effectLabel: "Ogni livello: chi è fermo passa il 10% del suo lavoro al primo settore attivo della fila · Livello 5: il 50%", effect: "collaboratorFallbackTier", effectPerLevel: 0.1, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 20_000, 40_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 3 },
  { id: "standard-procedures", category: "organization", title: "Procedure standard", description: "Ogni lavoro ripetitivo ha la sua procedura. Le automazioni girano più in fretta, e nessuno inventa più scorciatoie creative.", effectLabel: "Ogni livello: tutti i collaboratori lavorano il 5% più in fretta · Livello 5: +25%", effect: "automationMultiplier", effectPerLevel: 0.05, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 8 },
  { id: "registration-form", category: "organization", title: "Modulo di iscrizione", description: "Un modulo solo, chiaro, da firmare una volta. Le quote arrivano tutte, e la segreteria smette di rincorrere le persone.", effectLabel: "Ogni livello: +5% di entrate dalle quote mensili · Livello 5: +25%", effect: "membershipIncomeMultiplier", effectPerLevel: 0.05, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 13 },
  { id: "operational-priorities", category: "organization", title: "Priorità operative", description: "Decidi tu l'ordine della fila: chi sta davanti spende per primo e riceve l'aiuto dei Turni. Le discussioni su chi viene prima, invece, restano.", effectLabel: "Puoi riordinare la fila dei settori in Scuola", effect: "operationalPrioritiesUnlock", effectPerLevel: 1, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000], maxLevel: 1, requiredFame: noFame, requiredBranchPoints: 18, requiredUpgradeLevels: { "collaborator-shifts": 1 } },
  { id: "order-secretariat", category: "organization", title: "A.N.D.E.R.", description: "Arriva A.N.D.E.R., che si occupa di notifiche, quote e pratiche. Non dorme, non sbaglia, e ci tiene a farlo sapere.", effectLabel: "Ogni livello: +10% sulle entrate mensili di quote e Social · Livello 5: +50%", effect: "incomeMultiplier", effectPerLevel: 0.1, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 18 },
  { id: "deposit-account", category: "organization", title: "Conto deposito", description: "La banca paga poco, ma paga. Il tesoriere dorme meglio.", effectLabel: "Ogni livello: ogni mese +0,5% di interessi sui Fondi, contando al massimo 250.000 € · Livello 5: +2,5%, fino a 6.250 € al mese", effect: "depositInterestRate", effectPerLevel: 0.005, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 20_000, 40_000, 80_000, 160_000], maxLevel: 5, requiredFame: noFame, requiredBranchPoints: 23 },
  { id: "multi-site-coordination", category: "organization", title: "Coordinamento multi-sede", description: "Le scuole della rete condividono strumenti e procedure. Quello che funziona in una sede, adesso funziona in tutte.", effectLabel: "Ogni livello: tutti i collaboratori lavorano il 10% più in fretta · Livello 5: +50%", effect: "automationMultiplier", effectPerLevel: 0.1, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000, 50_000, 100_000, 200_000, 400_000], maxLevel: 5, requiredFame: noFame, requiredNetworkSchools: 1, requiredBranchPoints: 23 },

  // Percorsi Segreti: si scoprono con le imprese, non con i punti.
  { id: "project-x", category: "secrets", title: "Corso X", description: "Un anno dedicato a una Forma 1 più avanzata e ai primi rudimenti di Forma 2 in arena. Chi ci arriva, di solito, non torna indietro.", effectLabel: "Apre il Corso X, con le sue qualifiche da Istruttore e Tecnico", effect: "courseXUnlock", effectPerLevel: 1, baseCost: 1, costGrowth: LEVEL_GROWTH, levelCosts: [1], networkCostGrowth: 0, maxLevel: 1, requiredFame: noFame, secretHint: "Vincere il torneo più superbo dell'anno è solo l'inizio" },
  { id: "divine-touch", category: "secrets", title: "ToccoDiGilo", description: "Gli Istruttori insegnano le Forme a una velocità che non ha spiegazioni. Meglio non chiederne.", effectLabel: "Gli Istruttori insegnano le Forme quasi all'istante (+9999%)", effect: "instructorTeachingSpeed", effectPerLevel: 99.99, baseCost: 1_000_000, costGrowth: LEVEL_GROWTH, levelCosts: [1_000_000], networkCostGrowth: 0, maxLevel: 1, requiredFame: noFame, secretHint: "Esistono forze più grandi di quanto avresti mai potuto immaginare" },

  // Nodi storici: restano nel formato del salvataggio, ma non producono più effetti.
  { id: "athletic-preparation", category: "instructors", title: "Preparazione agonistica", description: "Voce storica accorpata in Nessun Rancore.", effectLabel: "Effetto trasferito", effect: "legacy", effectPerLevel: 0, baseCost: 0, costGrowth: LEVEL_GROWTH, maxLevel: 5, requiredFame: noFame, hidden: true },
  { id: "social-editorial-plan", category: "social", title: "Piano editoriale", description: "Voce storica accorpata in Pubblicità vincente.", effectLabel: "Effetto trasferito", effect: "legacy", effectPerLevel: 0, baseCost: 0, costGrowth: LEVEL_GROWTH, maxLevel: 5, requiredFame: noFame, hidden: true },
  { id: "social-content-distribution", category: "social", title: "Promozione degli eventi", description: "Voce storica conservata per la compatibilità dei salvataggi.", effectLabel: "Nessun effetto", effect: "legacy", effectPerLevel: 0, baseCost: 0, costGrowth: LEVEL_GROWTH, maxLevel: 5, requiredFame: noFame, hidden: true },
  { id: "social-sponsorships", category: "social", title: "Sponsorizzazioni", description: "Voce storica accorpata nel Corso di Marketing.", effectLabel: "Effetto trasferito", effect: "legacy", effectPerLevel: 0, baseCost: 0, costGrowth: LEVEL_GROWTH, maxLevel: 5, requiredFame: noFame, hidden: true },
  { id: "extra-form", category: "instructors", title: "Doppio Corso", description: "Voce storica accorpata in Didattica di gruppo.", effectLabel: "Effetto trasferito", effect: "legacy", effectPerLevel: 0, baseCost: 0, costGrowth: LEVEL_GROWTH, networkCostGrowth: 0, maxLevel: 1, requiredFame: noFame, hidden: true },
  { id: "tiamat-instructor", category: "instructors", title: "Istruttore Tiamat", description: "Voce storica accorpata in Didattica di gruppo.", effectLabel: "Effetto trasferito", effect: "legacy", effectPerLevel: 0, baseCost: 0, costGrowth: LEVEL_GROWTH, networkCostGrowth: 0, maxLevel: 4, requiredFame: noFame, hidden: true },
];

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = UPGRADE_CATALOG;

export function createInitialUpgradeLevels(): UpgradeLevels {
  return Object.fromEntries(
    UPGRADE_DEFINITIONS.map((definition) => [definition.id, 0]),
  ) as UpgradeLevels;
}

export function getUpgradeDefinition(id: UpgradeId) {
  return UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === id);
}

/** Points of a branch: every level bought in its visible nodes counts 1. */
export function getUpgradeCategoryPoints(
  levels: UpgradeLevels,
  category: UpgradeCategory,
): number {
  return UPGRADE_DEFINITIONS.reduce(
    (total, definition) =>
      definition.category === category && !definition.hidden
        ? total + (levels[definition.id] ?? 0)
        : total,
    0,
  );
}

export type MissingUpgradeRequirement =
  | { kind: "points"; category: UpgradeCategory; required: number; current: number }
  | { kind: "upgrade"; definition: UpgradeDefinition; level: number };

/**
 * Every requirement that opens a node, in display order: its branch points,
 * then narrative links (points of another branch, a node at a given level).
 */
export function getUpgradeRequirements(
  levels: UpgradeLevels,
  definition: UpgradeDefinition,
): Array<MissingUpgradeRequirement & { met: boolean }> {
  const requirements: Array<MissingUpgradeRequirement & { met: boolean }> = [];
  const pointsFor = (category: UpgradeCategory, required: number) => {
    const current = getUpgradeCategoryPoints(levels, category);
    requirements.push({ kind: "points", category, required, current, met: current >= required });
  };
  if (definition.requiredBranchPoints) pointsFor(definition.category, definition.requiredBranchPoints);
  for (const [category, required = 0] of Object.entries(definition.requiredCategoryPoints ?? {})) {
    pointsFor(category as UpgradeCategory, required);
  }
  for (const [id, level = 0] of Object.entries(definition.requiredUpgradeLevels ?? {})) {
    const required = getUpgradeDefinition(id as UpgradeId);
    if (!required) continue;
    requirements.push({
      kind: "upgrade",
      definition: required,
      level,
      met: (levels[required.id] ?? 0) >= level,
    });
  }
  return requirements;
}

export function getMissingUpgradeRequirement(
  levels: UpgradeLevels,
  definition: UpgradeDefinition,
): MissingUpgradeRequirement | undefined {
  return getUpgradeRequirements(levels, definition).find((requirement) => !requirement.met);
}

export function hasCompletedUpgradePrerequisites(
  levels: UpgradeLevels,
  definition: UpgradeDefinition,
) {
  return !getMissingUpgradeRequirement(levels, definition);
}

export function getUpgradeCost(
  definition: UpgradeDefinition,
  currentLevel: number,
  networkSchools = 0,
) {
  const localCost = definition.levelCosts?.[currentLevel] ??
    definition.baseCost * definition.costGrowth ** currentLevel;
  return Math.round(
    localCost * (1 + networkSchools * (definition.networkCostGrowth ?? 0.15)),
  );
}

export function getUpgradePrimaryEffectTotal(
  levels: UpgradeLevels,
  upgradeId: UpgradeId,
): number {
  const definition = getUpgradeDefinition(upgradeId);
  if (!definition) return 0;
  return getDefinitionEffectTotal(
    definition,
    levels[upgradeId] ?? 0,
    definition.effect,
  );
}

function getDefinitionEffectTotal(
  definition: UpgradeDefinition,
  level: number,
  effect: UpgradeEffect,
): number {
  const cappedLevel = Math.min(
    level,
    definition.effectLevelCap ?? definition.maxLevel,
  );
  const effectiveLevel = Math.max(
    0,
    cappedLevel - (definition.effectStartingLevel ?? 1) + 1,
  );
  const repeatedEffectPerLevel =
    (definition.effect === effect ? definition.effectPerLevel : 0) +
    (definition.additionalEffectsPerLevel?.[effect] ?? 0);
  const scheduledEffect = definition.effectsByLevel
    ?.slice(0, cappedLevel)
    .reduce((total, levelEffects) => total + (levelEffects[effect] ?? 0), 0) ?? 0;
  return effectiveLevel * repeatedEffectPerLevel + scheduledEffect;
}

export function getUpgradeEffectTotal(
  levels: UpgradeLevels,
  effect: UpgradeEffect,
): number {
  return UPGRADE_DEFINITIONS.reduce(
    (total, definition) =>
      total +
      getDefinitionEffectTotal(definition, levels[definition.id] ?? 0, effect),
    0,
  );
}

export function getUpgradeEffectMaximum(effect: UpgradeEffect): number {
  return UPGRADE_DEFINITIONS.reduce(
    (total, definition) =>
      total +
      getDefinitionEffectTotal(definition, definition.maxLevel, effect),
    0,
  );
}

export function getTrainingExamSuccessChanceBonus(levels: UpgradeLevels): number {
  return getUpgradeEffectTotal(levels, "trainingExamSuccessChance");
}

export function getInstructorBranchCapacityBonus(levels: UpgradeLevels): number {
  return getUpgradeEffectTotal(levels, "instructorBranchCapacity");
}

export function areAllFormBranchesUnlocked(levels: UpgradeLevels): boolean {
  return getUpgradeEffectTotal(levels, "unrestrictedFormBranches") > 0;
}

export function getAnnualFormTrainingLimit(levels: UpgradeLevels): number {
  return 1 + Number((levels["promiscuous-instructor"] ?? 0) >= 6) +
    Number((levels.pagosport ?? 0) >= 1);
}

export function getAgonistCourseMaximumStatGain(levels: UpgradeLevels): number {
  return Math.min(5, 1 + getUpgradeEffectTotal(levels, "agonistCourseStatMaximum"));
}

export function isAgonistCourseUnlocked(levels: UpgradeLevels): boolean {
  return (levels["agonist-course-intensity"] ?? 0) >= 1;
}

export function isAthleticPreparationUnlocked(levels: UpgradeLevels): boolean {
  return (levels["agonist-course-intensity"] ?? 0) >= 5;
}

export function getPagoSportAllCourseSpeedBonus(levels: UpgradeLevels): number {
  return (levels.pagosport ?? 0) >= 3 ? 0.5 : 0;
}

export function getPagoSportTechnicianSpeedBonus(levels: UpgradeLevels): number {
  return (levels.pagosport ?? 0) >= 2 ? 0.5 : 0;
}

export function getSISTechnicianCourseSpeedBonus(levels: UpgradeLevels): number {
  return Math.max(0, Math.min(3, (levels["sis-accreditation"] ?? 0) - 1)) * 0.1;
}

export function getQualifyingCourseCostMultiplier(levels: UpgradeLevels): number {
  return 1 - Math.min(0.25, getUpgradeEffectTotal(levels, "courseCostReduction"));
}

export function applyQualifyingCourseDiscount(
  levels: UpgradeLevels,
  cost: number,
): number {
  return Math.round(cost * getQualifyingCourseCostMultiplier(levels) * 100) / 100;
}

export function getCreativityProgress(levels: UpgradeLevels): number {
  return Math.min(1, getUpgradeEffectTotal(levels, "creativityPoint") / 35);
}

export function getTrialDurationMs(levels: UpgradeLevels, baseDurationMs: number): number {
  return Math.max(
    10_000,
    baseDurationMs - getUpgradeEffectTotal(levels, "trialDurationReductionMs"),
  );
}

export function getEquipmentPreparedWorkMaximum(state: Pick<GameState, "equipment" | "upgrades">): number {
  return state.equipment.totalSwords * 100 * Math.min(
    0.1,
    getUpgradeEffectTotal(state.upgrades, "equipmentPreparedWorkCapacity"),
  );
}

export function getEquipmentSwordRepairWork(levels: UpgradeLevels): number {
  return Math.max(
    75,
    150 - getUpgradeEffectTotal(levels, "equipmentSwordRepairWorkReduction"),
  );
}

export function isOfficialSwordSupplierUnlocked(levels: UpgradeLevels): boolean {
  return getUpgradeEffectTotal(levels, "officialSwordSupplierUnlock") >= 1;
}

/** Occhio del Maestro: 0 never, 1 after Corso Y, 2 from enrolment. */
export function getOfficialStatsVisibilityTier(levels: UpgradeLevels): number {
  return Math.min(2, getUpgradeEffectTotal(levels, "officialStatsVisibilityTier"));
}

/** Istruttori in e-Learning: how far Istruttori train themselves (0 none, 1 Forma 1, 2 Forma 2, 3 Corso Y). */
export function getInstructorSelfTrainingTier(levels: UpgradeLevels): number {
  return Math.min(3, getUpgradeEffectTotal(levels, "instructorSelfTrainingTier"));
}

/** Eventi nel Multiverso: extra copies of the same event that may run at once. */
export function getEventExtraCopies(levels: UpgradeLevels): number {
  return Math.min(2, getUpgradeEffectTotal(levels, "eventCopyCapacity"));
}

/** Eventi nel Multiverso: every running copy finds 25% fewer contacts (−25%, −50%). */
export function getEventCopyContactMultiplier(runningCopies: number): number {
  return Math.max(0.5, 1 - 0.25 * runningCopies);
}

/** Chat di Gruppo: share of the annual non-renewal risk taken away. */
export function getDepartureRiskReduction(levels: UpgradeLevels): number {
  return Math.min(0.5, getUpgradeEffectTotal(levels, "departureRiskReduction"));
}

/** Calendario fitto: what is left of the wait before an event can run again. */
export function getEventCooldownMultiplier(levels: UpgradeLevels): number {
  return 1 - Math.min(0.5, getUpgradeEffectTotal(levels, "eventCooldownReduction"));
}

/** Rhythm Gamer: ×(1 + 0,2 per livello) on the chance to open the next rarity. */
export function getGadgetRarityChanceMultiplier(levels: UpgradeLevels): number {
  return 1 + getUpgradeEffectTotal(levels, "gadgetRarityChanceMultiplier");
}

export function isOperationalPrioritiesUnlocked(levels: UpgradeLevels): boolean {
  return getUpgradeEffectTotal(levels, "operationalPrioritiesUnlock") >= 1;
}

export function isSISTechnicianCourseUnlocked(levels: UpgradeLevels): boolean {
  return getUpgradeEffectTotal(levels, "sisTechnicianCourseUnlock") >= 1;
}

export function isCourseXUnlocked(levels: UpgradeLevels): boolean {
  return getUpgradeEffectTotal(levels, "courseXUnlock") >= 1;
}
