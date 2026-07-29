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
  | "annualFormCapacity"
  | "instructorBranchCapacity"
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
  requiredUpgradeLevels?: Partial<Record<UpgradeId, number>>;
  requiredGadgetProduct?: GadgetProductId;
  requiredNetworkSchools?: number;
  hidden?: boolean;
  extension?: boolean;
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
  { id: "equipment", title: "Attrezzatura", description: "Riduce l'usura programmata e automatizza la manutenzione." },
  { id: "gadget", title: "Gadget", description: "Amplia il pubblico e rende più rapidi sviluppo, revisioni e vendite." },
  { id: "instructors", title: "Insegnamento", description: "Sviluppa Istruttori, Tecnici e preparazione agonistica." },
  { id: "organization", title: "Organizzazione", description: "Coordina collaboratori, automazioni ed entrate ricorrenti." },
  { id: "secrets", title: "Percorsi Segreti", description: "Alcuni percorsi si rivelano soltanto compiendo imprese particolari." },
];

const LEVEL_GROWTH = 1;
const noFame = 0;

const UPGRADE_CATALOG: UpgradeDefinition[] = [
  // Scrittura
  { id: "comfortable-keyboard", category: "speed", title: "Tastiera comoda", description: "Una postazione più efficace rende ogni pressione più produttiva.", effectLabel: "+0,2 caratteri per input e livello · massimo +1", effect: "writingPower", effectPerLevel: 0.2, baseCost: 50, costGrowth: LEVEL_GROWTH, levelCosts: [50, 100, 200, 400, 800], maxLevel: 5, requiredFame: noFame, requiredUpgradeLevels: {} },
  { id: "quick-phrases", category: "speed", title: "Frasi rapide", description: "Le formule più frequenti arrivano prima ancora di pensarle.", effectLabel: "+0,4 caratteri per input e livello · massimo +2", effect: "writingPower", effectPerLevel: 0.4, baseCost: 150, costGrowth: LEVEL_GROWTH, levelCosts: [150, 300, 600, 1_200, 2_400], maxLevel: 5, requiredFame: noFame, requiredUpgradeLevels: { "comfortable-keyboard": 2 } },
  { id: "automatic-signature", category: "speed", title: "Firma automatica", description: "La chiusura delle email non rallenta più il lavoro della Redazione.", effectLabel: "+10% velocità Redazione/Social per livello · massimo +50%", effect: "editorialAutomationMultiplier", effectPerLevel: 0.1, baseCost: 300, costGrowth: LEVEL_GROWTH, levelCosts: [300, 600, 1_200, 2_400, 4_800], maxLevel: 5, requiredFame: noFame, requiredUpgradeLevels: { "quick-phrases": 2 } },
  { id: "smart-fields", category: "speed", title: "Campi intelligenti", description: "Nome, luogo e dettagli pratici vengono compilati quando nasce una nuova email.", effectLabel: "Le nuove email partono al 5% per livello · massimo 25%", effect: "emailInitialProgress", effectPerLevel: 0.05, baseCost: 600, costGrowth: LEVEL_GROWTH, levelCosts: [600, 1_200, 2_400, 4_800, 9_600], maxLevel: 5, requiredFame: noFame, requiredUpgradeLevels: { "automatic-signature": 2 } },
  { id: "social-content-synthesis", category: "speed", title: "Sintesi dei contenuti", description: "Riduce il lavoro necessario per pubblicare ciascun contenuto Social.", effectLabel: "100.000 → 90.000 → 80.000 → 70.000 → 60.000 → 50.000 caratteri", effect: "socialContentTier", effectPerLevel: 1, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 20_000, 40_000], maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["social"], requiredUpgradeLevels: { "smart-fields": 2 } },
  { id: "instant-review", category: "speed", title: "Revisione istantanea", description: "La revisione condivisa accelera tutta la produzione editoriale.", effectLabel: "+15% velocità Redazione/Social per livello · massimo +75%", effect: "editorialAutomationMultiplier", effectPerLevel: 0.15, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 20_000, 40_000], maxLevel: 5, requiredFame: noFame, requiredUpgradeLevels: { "smart-fields": 3 } },
  { id: "mail-merge", category: "speed", title: "Fusione documenti", description: "Una parte del lavoro svolto sull'email alimenta anche i contenuti Social, senza rallentare l'email.", effectLabel: "Copia il 5% del lavoro email nei Social per livello · massimo 25%", effect: "socialCopyShare", effectPerLevel: 0.05, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000, 50_000, 100_000, 200_000, 400_000], maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["social"], requiredUpgradeLevels: { "social-content-synthesis": 3, "instant-review": 3 } },

  // Creatività
  { id: "spell-check", category: "writing", title: "Controllo ortografico", description: "La stessa email viene ripulita da refusi ed errori grammaticali.", effectLabel: "+1 punto Creatività per livello · nuovo catalogo dal primo livello", effect: "creativityPoint", effectPerLevel: 1, baseCost: 50, costGrowth: LEVEL_GROWTH, levelCosts: [50, 100, 200, 400, 800], maxLevel: 5, requiredFame: noFame, requiredUpgradeLevels: {} },
  { id: "professional-email", category: "writing", title: "Email professionale", description: "Firma completa, paragrafi ordinati e spaziature corrette, ancora senza HTML.", effectLabel: "+1 punto Creatività per livello", effect: "creativityPoint", effectPerLevel: 1, baseCost: 100, costGrowth: LEVEL_GROWTH, levelCosts: [100, 200, 400, 800, 1_600], maxLevel: 5, requiredFame: noFame },
  { id: "personalized-invite", category: "writing", title: "Invito personalizzato", description: "Un nuovo catalogo più ricco introduce la struttura HTML.", effectLabel: "+1 punto Creatività per livello · sblocca le email HTML", effect: "creativityPoint", effectPerLevel: 1, baseCost: 150, costGrowth: LEVEL_GROWTH, levelCosts: [150, 300, 600, 1_200, 2_400], maxLevel: 5, requiredFame: noFame },
  { id: "call-to-action", category: "writing", title: "Call to action", description: "Link e pulsanti rendono immediato il passo successivo.", effectLabel: "+1 punto Creatività per livello", effect: "creativityPoint", effectPerLevel: 1, baseCost: 300, costGrowth: LEVEL_GROWTH, levelCosts: [300, 600, 1_200, 2_400, 4_800], maxLevel: 5, requiredFame: noFame },
  { id: "email-layout", category: "writing", title: "Impaginazione", description: "La campagna riceve una struttura visiva ordinata e riconoscibile.", effectLabel: "+1 punto Creatività per livello", effect: "creativityPoint", effectPerLevel: 1, baseCost: 600, costGrowth: LEVEL_GROWTH, levelCosts: [600, 1_200, 2_400, 4_800, 9_600], maxLevel: 5, requiredFame: noFame },
  { id: "winning-advertising", category: "writing", title: "Pubblicità vincente", description: "Il messaggio diventa un volantino completo e migliora anche la capacità dei contenuti Social di ottenere follower.", effectLabel: "+1 punto Creatività · follower Social 60% → 70% → 80% → 90% → 95%; al 5° livello 5% di follower doppio", effect: "creativityPoint", effectPerLevel: 1, additionalEffectsPerLevel: { socialFollowerChanceTier: 1 }, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame },
  { id: "marketing-course", category: "writing", title: "Corso di Marketing", description: "La campagna completa spiega lo sport in profondità e aumenta il valore economico dei follower.", effectLabel: "+1 punto Creatività · valore follower 0,15 € → 0,20 € → 0,30 € → 0,40 € → 0,50 €", effect: "creativityPoint", effectPerLevel: 1, additionalEffectsPerLevel: { socialFollowerValueTier: 1 }, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000], maxLevel: 5, requiredFame: noFame },

  // Carisma
  { id: "prepared-presentation", category: "charisma", title: "Presentazione preparata", description: "Spiegazioni più chiare trasformano gli incontri in contatti utili.", effectLabel: "+4% contatti dagli eventi per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.04, baseCost: 50, costGrowth: LEVEL_GROWTH, levelCosts: [50, 100, 200, 400, 800], maxLevel: 5, requiredFame: noFame },
  { id: "qr-cards", category: "charisma", title: "Biglietti con QR code", description: "Lasciare un indirizzo diventa immediato.", effectLabel: "+4% contatti dagli eventi per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.04, baseCost: 100, costGrowth: LEVEL_GROWTH, levelCosts: [100, 200, 400, 800, 1_600], maxLevel: 5, requiredFame: noFame },
  { id: "coordinated-demo", category: "charisma", title: "Dimostrazione coordinata", description: "Una presentazione ordinata trattiene più pubblico.", effectLabel: "+5% pubblico agli eventi per livello", effect: "eventAttendanceMultiplier", effectPerLevel: 0.05, baseCost: 150, costGrowth: LEVEL_GROWTH, levelCosts: [150, 300, 600, 1_200, 2_400], maxLevel: 5, requiredFame: noFame },
  { id: "recognizable-stand", category: "charisma", title: "Stand riconoscibile", description: "Il pubblico capisce subito dove fermarsi.", effectLabel: "+7% pubblico agli eventi per livello", effect: "eventAttendanceMultiplier", effectPerLevel: 0.07, baseCost: 300, costGrowth: LEVEL_GROWTH, levelCosts: [300, 600, 1_200, 2_400, 4_800], maxLevel: 5, requiredFame: noFame },
  { id: "demo-set", category: "charisma", title: "Set da dimostrazione", description: "Una dimostrazione più leggibile richiama più persone.", effectLabel: "+6% pubblico agli eventi per livello", effect: "eventAttendanceMultiplier", effectPerLevel: 0.06, baseCost: 600, costGrowth: LEVEL_GROWTH, levelCosts: [600, 1_200, 2_400, 4_800, 9_600], maxLevel: 5, requiredFame: noFame },
  { id: "difficult-questions", category: "charisma", title: "Risposte alle domande difficili", description: "Anche le domande più specifiche ricevono una risposta utile.", effectLabel: "+6% contatti dagli eventi per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.06, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame },
  { id: "not-that-thing", category: "charisma", title: "No, non è esattamente quella cosa", description: "La spiegazione definitiva, sorprendentemente efficace.", effectLabel: "+8% contatti dagli eventi per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.08, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000], maxLevel: 5, requiredFame: noFame },

  // Accoglienza
  { id: "welcome-procedure", category: "welcome", title: "Procedura di benvenuto", description: "Una prima lezione più curata che facilita la scoperta dello sport.", effectLabel: "+1% possibilità di iscrizioni per livello", effect: "enrollmentProgress", effectPerLevel: 0.01, baseCost: 50, costGrowth: LEVEL_GROWTH, levelCosts: [50, 100, 200, 400, 800], maxLevel: 5, requiredFame: noFame },
  { id: "clear-material", category: "welcome", title: "Materiale informativo chiaro", description: "Orari, costi e percorso formativo a prova di JarJar.", effectLabel: "+1,5% possibilità di iscrizioni per livello", effect: "enrollmentProgress", effectPerLevel: 0.015, baseCost: 150, costGrowth: LEVEL_GROWTH, levelCosts: [150, 300, 600, 1_200, 2_400], maxLevel: 5, requiredFame: noFame },
  { id: "tested-intro", category: "welcome", title: "Lezione introduttiva collaudata", description: "La prima croce è un ottimo modo di iniziare", effectLabel: "+2% possibilità di iscrizioni per livello", effect: "enrollmentProgress", effectPerLevel: 0.02, baseCost: 300, costGrowth: LEVEL_GROWTH, levelCosts: [300, 600, 1_200, 2_400, 4_800], maxLevel: 5, requiredFame: noFame },
  { id: "prepared-room", category: "welcome", title: "Sala preparata", description: "Ogni uniforme ufficiale è lavata e stirata.", effectLabel: "+2,5% possibilità di iscrizioni e −1 secondo alla prova per livello · minimo 10 secondi", effect: "enrollmentProgress", effectPerLevel: 0.025, additionalEffectsPerLevel: { trialDurationReductionMs: 1_000 }, baseCost: 600, costGrowth: LEVEL_GROWTH, levelCosts: [600, 1_200, 2_400, 4_800, 9_600], maxLevel: 5, requiredFame: noFame },
  { id: "dedicated-helper", category: "welcome", title: "Collaboratore dedicato", description: "Un allievo esperto segue ogni nuovo partecipante e valorizza il contributo dell'Istruttore.", effectLabel: "+3% di possibilità di iscrizioni · +10% efficacia degli Istruttori per livello", effect: "enrollmentProgress", effectPerLevel: 0.03, additionalEffectsPerLevel: { instructorEnrollmentEffectiveness: 0.1 }, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 20_000, 40_000], maxLevel: 5, requiredFame: noFame },
  { id: "order-welcome", category: "welcome", title: "Accoglienza dell'Ordine", description: "Parlare del porkside dopo lezione è spesso un gran motivo per far iscrivere le persone.", effectLabel: "+4% possibilità di iscrizioni per livello", effect: "enrollmentProgress", effectPerLevel: 0.04, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame },
  { id: "memorable-experience", category: "welcome", title: "Esperienza memorabile", description: "Insegnare la Settima alla prima lezione di prova lascia un ricordo indelebile nella mente di chi prova e di chi guarda dalle altre classi.", effectLabel: "+6% possibilità di iscrizioni · 5% possibilità di contatto extra per livello · massimo 25%", effect: "enrollmentProgress", effectPerLevel: 0.06, additionalEffectsPerLevel: { failedTrialRetryChance: 0.05 }, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000], maxLevel: 5, requiredFame: noFame },

  // Attrezzatura
  { id: "pre-event-check", category: "equipment", title: "Controllo prima dell'uso", description: "I problemi vengono trovati prima di iniziare un'attività programmata.", effectLabel: "−2% usura programmata per livello", effect: "equipmentWearReduction", effectPerLevel: 0.02, baseCost: 100, costGrowth: LEVEL_GROWTH, levelCosts: [100, 200, 400, 800, 1_600], maxLevel: 5, requiredFame: noFame },
  { id: "maintenance-kit", category: "equipment", title: "Kit di manutenzione", description: "Gli strumenti giusti accelerano le riparazioni automatiche.", effectLabel: "+10% velocità manutenzione automatica per livello", effect: "equipmentAutomationMultiplier", effectPerLevel: 0.1, baseCost: 250, costGrowth: LEVEL_GROWTH, levelCosts: [250, 500, 1_000, 2_000, 4_000], maxLevel: 5, requiredFame: noFame },
  { id: "organized-rack", category: "equipment", title: "Banco da lavoro", description: "Quando tutto è in ordine, i collaboratori preparano in anticipo lavoro di manutenzione da usare al prossimo guasto.", effectLabel: "Riserva massima pari al 2% dell'usura massima di tutte le spade per livello · massimo 10%", effect: "equipmentPreparedWorkCapacity", effectPerLevel: 0.02, baseCost: 500, costGrowth: LEVEL_GROWTH, levelCosts: [500, 750, 1_000, 1_500, 2_500], maxLevel: 5, requiredFame: noFame },
  { id: "essential-parts", category: "equipment", title: "Ricambi essenziali", description: "I pezzi più comuni riducono il lavoro necessario per recuperare una spada rotta.", effectLabel: "−15 punti lavoro per spada rotta e livello · da 150 a 75", effect: "equipmentSwordRepairWorkReduction", effectPerLevel: 15, baseCost: 1_000, costGrowth: LEVEL_GROWTH, levelCosts: [1_000, 2_000, 4_000, 8_000, 16_000], maxLevel: 5, requiredFame: noFame },
  { id: "checklist", category: "equipment", title: "Lista di controllo", description: "Le operazioni programmate consumano meno l'attrezzatura.", effectLabel: "−4% usura programmata per livello", effect: "equipmentWearReduction", effectPerLevel: 0.04, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 20_000, 40_000], maxLevel: 5, requiredFame: noFame },
  { id: "equipment-register", category: "equipment", title: "Registro dell'attrezzatura", description: "Controlli e interventi vengono coordinati con più efficienza.", effectLabel: "+10% velocità manutenzione automatica per livello", effect: "equipmentAutomationMultiplier", effectPerLevel: 0.1, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame },
  { id: "all-fixed", category: "equipment", title: "Le abbiamo messe a posto tutte", description: "Una dichiarazione finalmente supportata dai fatti.", effectLabel: "−4% usura programmata per livello", effect: "equipmentWearReduction", effectPerLevel: 0.04, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000], maxLevel: 5, requiredFame: noFame },

  // Gadget: il ramo già bilanciato resta invariato.
  { id: "gadget-showcase", category: "gadget", title: "Vetrina della scuola", description: "Rende il catalogo visibile a una quota crescente degli iscritti.", effectLabel: "Pubblico iscritti: 10% → 20% → 35% → 50% → 75% → 100%", effect: "gadgetMemberReachTier", effectPerLevel: 1, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 25_000, 50_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredUpgradeLevels: {} },
  { id: "gadget-online-store", category: "gadget", title: "Negozio online", description: "Porta il catalogo a una quota crescente dei follower della scuola.", effectLabel: "Pubblico follower: 0% → 1% → 3% → 5% → 10% → 20% → 35% → 50% → 75% → 100%", effect: "gadgetFollowerReachTier", effectPerLevel: 1, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 25_000, 50_000, 100_000, 200_000, 400_000, 800_000, 1_600_000], networkCostGrowth: 0, maxLevel: 9, requiredFame: noFame, requiredUnlocks: ["gadget", "social"], requiredUpgradeLevels: { "gadget-showcase": 2 } },
  { id: "gadget-design-tools", category: "gadget", title: "Strumenti di progettazione", description: "Riduce il tempo necessario a sviluppare il primo prototipo.", effectLabel: "+20% velocità di progettazione per livello · massimo +100%", effect: "gadgetDevelopmentSpeed", effectPerLevel: 0.2, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredUpgradeLevels: {} },
  { id: "gadget-revision-lab", category: "gadget", title: "Laboratorio revisioni", description: "Accelera il lavoro che precede un nuovo tentativo di qualità.", effectLabel: "+20% velocità di revisione per livello · massimo +100%", effect: "gadgetRevisionSpeed", effectPerLevel: 0.2, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredUpgradeLevels: { "gadget-design-tools": 2 } },
  { id: "gadget-order-management", category: "gadget", title: "Gestione degli ordini", description: "Aumenta il numero di tentativi commerciali gestiti ogni mese.", effectLabel: "+20% capacità commerciale per livello · massimo +100%", effect: "gadgetSalesCapacity", effectPerLevel: 0.2, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 20_000, 40_000, 80_000, 160_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredUpgradeLevels: {} },
  { id: "gadget-sales-training", category: "gadget", title: "Formazione commerciale", description: "Aiuta i Collaboratori a convertire più tentativi in vendite effettive.", effectLabel: "+2 punti percentuali di conversione per livello · massimo +10", effect: "gadgetSalesConversion", effectPerLevel: 0.02, baseCost: 15_000, costGrowth: LEVEL_GROWTH, levelCosts: [15_000, 30_000, 60_000, 120_000, 240_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredUpgradeLevels: { "gadget-order-management": 2 } },
  { id: "gadget-cross-selling", category: "gadget", title: "Vendita abbinata", description: "Una parte degli ordini genera automaticamente la vendita di un altro gadget disponibile.", effectLabel: "+5% vendite abbinate per livello · massimo +25%", effect: "gadgetCrossSell", effectPerLevel: 0.05, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000, 50_000, 100_000, 200_000, 400_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUnlocks: ["gadget"], requiredUpgradeLevels: { "gadget-sales-training": 3 }, requiredGadgetProduct: "mug" },

  // Insegnamento
  { id: "technical-arena", category: "instructors", title: "Percorso Tecnico", description: "Sblocca Arena Tecnica e ne riduce progressivamente la durata.", effectLabel: "L1 Arena Tecnica · L2 durata 120→100 s · L3 durata 100→80 s · L4 durata 80→60 s · L5 durata 60→40 s", effect: "agonistCourseTier", effectPerLevel: 1, baseCost: 1_000, costGrowth: LEVEL_GROWTH, levelCosts: [1_000, 2_000, 5_000, 7_500, 10_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUpgradeLevels: {} },
  { id: "instructor-versatility", category: "instructors", title: "Master of none", description: "Permette agli Istruttori di apprendere rami d'arma oltre le preferenze iniziali.", effectLabel: "+1 ramo d'arma accessibile per livello", effect: "instructorBranchCapacity", effectPerLevel: 1, baseCost: 2_000, costGrowth: LEVEL_GROWTH, levelCosts: [2_000, 4_000], networkCostGrowth: 0, maxLevel: 2, requiredFame: noFame, requiredUpgradeLevels: { "technical-arena": 1 } },
  { id: "sis-accreditation", category: "instructors", title: "Tu conosci la SIS?", description: "Attiva le candidature alla Scuola Internazionale Superiore e accelera gradualmente i Corsi Tecnici.", effectLabel: "L1 candidature SIS · L2 +10% velocità · L3 +20% · L4 +30%", effect: "sisTechnicianCourseUnlock", effectPerLevel: 1, effectLevelCap: 1, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000], networkCostGrowth: 0, maxLevel: 4, requiredFame: noFame, requiredUpgradeLevels: { "instructor-versatility": 2 } },
  { id: "cost-of-service", category: "instructors", title: "Il costo del Servizio", description: "Riduce il costo dei percorsi che assegnano un attestato da Istruttore o una qualifica da Tecnico.", effectLabel: "−5% costo dei corsi Istruttori/Tecnici per livello · massimo −25%", effect: "courseCostReduction", effectPerLevel: 0.05, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 25_000, 50_000], networkCostGrowth: 0, maxLevel: 5, requiredFame: noFame, requiredUpgradeLevels: { "sis-accreditation": 1 } },
  { id: "promiscuous-instructor", category: "instructors", title: "Didattica di gruppo", description: "Aumenta fino a sei gli allievi seguiti contemporaneamente; l'ultimo livello concede un secondo corso annuale.", effectLabel: "L1–L5: capacità 2→6 allievi · L6: +1 corso annuale", effect: "instructorStudentCapacity", effectPerLevel: 1, effectLevelCap: 5, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000, 400_000], networkCostGrowth: 0, maxLevel: 6, requiredFame: noFame, requiredUpgradeLevels: { "cost-of-service": 2 } },
  { id: "athletic-preparation", category: "instructors", title: "Preparazione agonistica", description: "Voce storica accorpata in Nessun Rancore.", effectLabel: "Effetto trasferito", effect: "legacy", effectPerLevel: 0, baseCost: 0, costGrowth: LEVEL_GROWTH, maxLevel: 5, requiredFame: noFame, hidden: true },
  {
    id: "agonist-course-intensity",
    category: "instructors",
    title: "Nessun Rancore",
    emphasizedTitlePart: "Rancor",
    description: "Trasforma Arena Tecnica nel Corso Agonisti e sviluppa poi il corso e la Preparazione agonistica.",
    effectLabel: "L1 Corso Agonisti (€1.000, 60 s) · L2–L4 massimo fino a +4/+4 · L5 Preparazione agonistica · L6–L9 +10% efficacia · L10 +10% efficacia e massimo +5/+5",
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
    requiredUpgradeLevels: { "promiscuous-instructor": 6, "technical-arena": 3 },
  },
  { id: "pagosport", category: "instructors", title: "PagoSport", description: "Amplia il piano formativo e accelera Tecnici, Istruttori e atleti.", effectLabel: "L1 +1 corso annuo · L2 +50% velocità Corsi Tecnici · L3 +50% velocità di tutti i corsi", effect: "annualFormCapacity", effectPerLevel: 1, effectLevelCap: 1, baseCost: 100_000, costGrowth: LEVEL_GROWTH, levelCosts: [100_000, 200_000, 400_000], networkCostGrowth: 0, maxLevel: 3, requiredFame: noFame, requiredUpgradeLevels: { "agonist-course-intensity": 10 } },

  // Organizzazione
  { id: "shared-calendar", category: "organization", title: "Manuale operativo", description: "Procedure condivise fanno crescere più rapidamente la Maestria dei collaboratori.", effectLabel: "+10% esperienza Maestria per livello · massimo +50%", effect: "masteryExperienceMultiplier", effectPerLevel: 0.1, baseCost: 500, costGrowth: LEVEL_GROWTH, levelCosts: [500, 1_000, 2_000, 4_000, 8_000], maxLevel: 5, requiredFame: noFame },
  { id: "collaborator-shifts", category: "organization", title: "Turni dei collaboratori", description: "Quando il settore principale è inattivo, una parte della produttività passa a un settore secondario scelto.", effectLabel: "Trasferisce il 10% della produttività per livello · massimo 50%", effect: "collaboratorFallbackTier", effectPerLevel: 0.1, baseCost: 2_500, costGrowth: LEVEL_GROWTH, levelCosts: [2_500, 5_000, 10_000, 20_000, 40_000], maxLevel: 5, requiredFame: noFame },
  { id: "standard-procedures", category: "organization", title: "Procedure standard", description: "Le automazioni ordinarie condividono passaggi e strumenti comuni.", effectLabel: "+5% velocità delle automazioni generiche per livello · massimo +25%", effect: "automationMultiplier", effectPerLevel: 0.05, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame },
  { id: "registration-form", category: "organization", title: "Modulo di iscrizione", description: "Quote e registrazioni scorrono con meno dispersioni.", effectLabel: "+5% entrate dalle quote per livello · massimo +25%", effect: "membershipIncomeMultiplier", effectPerLevel: 0.05, baseCost: 5_000, costGrowth: LEVEL_GROWTH, levelCosts: [5_000, 10_000, 20_000, 40_000, 80_000], maxLevel: 5, requiredFame: noFame },
  { id: "operational-priorities", category: "organization", title: "Priorità operative", description: "Sblocca la scelta dell'ordine con cui le Aree di Attività consumano Euro e risorse scarse.", effectLabel: "Sblocca l'ordinamento delle priorità operative", effect: "operationalPrioritiesUnlock", effectPerLevel: 1, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000], maxLevel: 1, requiredFame: noFame },
  { id: "order-secretariat", category: "organization", title: "A.N.D.E.R.", description: "Notifiche, quote e pratiche seguono una procedura stabile.", effectLabel: "+10% a tutte le entrate ricorrenti per livello · massimo +50%", effect: "incomeMultiplier", effectPerLevel: 0.1, baseCost: 10_000, costGrowth: LEVEL_GROWTH, levelCosts: [10_000, 25_000, 50_000, 100_000, 200_000], maxLevel: 5, requiredFame: noFame },
  { id: "multi-site-coordination", category: "organization", title: "Coordinamento multi-sede", description: "La rete condivide strumenti e capacità operative tra le scuole.", effectLabel: "+10% velocità delle automazioni generiche per livello · massimo +50%", effect: "automationMultiplier", effectPerLevel: 0.1, baseCost: 25_000, costGrowth: LEVEL_GROWTH, levelCosts: [25_000, 50_000, 100_000, 200_000, 400_000], maxLevel: 5, requiredFame: noFame, requiredNetworkSchools: 1 },

  // Percorsi Segreti
  { id: "project-x", category: "secrets", title: "Corso X", description: "Introduce un anno formativo dedicato a una Forma 1 più avanzata e ai rudimenti di Forma 2 applicati al combattimento in arena.", effectLabel: "Sblocca Corso X e le relative qualifiche da Istruttore e Tecnico", effect: "courseXUnlock", effectPerLevel: 1, baseCost: 1, costGrowth: LEVEL_GROWTH, levelCosts: [1], networkCostGrowth: 0, maxLevel: 1, requiredFame: noFame, requiredUpgradeLevels: {}, secretHint: "Vincere il torneo più superbo dell'anno è solo l'inizio" },
  { id: "divine-touch", category: "secrets", title: "ToccoDiGilo", description: "L'insegnamento delle Forme da parte degli Istruttori raggiunge una velocità sovrumana.", effectLabel: "+9999% velocità di insegnamento", effect: "instructorTeachingSpeed", effectPerLevel: 99.99, baseCost: 1_000_000, costGrowth: LEVEL_GROWTH, levelCosts: [1_000_000], networkCostGrowth: 0, maxLevel: 1, requiredFame: noFame, requiredUpgradeLevels: {}, secretHint: "Esistono forze più grandi di quanto avresti mai potuto immaginare" },

  // Nodi storici: restano nel formato del salvataggio, ma non producono più effetti.
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

export function getFirstIncompleteUpgradePrerequisite(
  levels: UpgradeLevels,
  definition: UpgradeDefinition,
) {
  if (definition.requiredUpgradeLevels) {
    const incompleteId = Object.entries(definition.requiredUpgradeLevels).find(
      ([upgradeId, requiredLevel]) =>
        (levels[upgradeId as UpgradeId] ?? 0) < (requiredLevel ?? 0),
    )?.[0] as UpgradeId | undefined;
    return incompleteId ? getUpgradeDefinition(incompleteId) : undefined;
  }
  const categoryDefinitions = UPGRADE_DEFINITIONS.filter(
    (upgrade) =>
      upgrade.category === definition.category &&
      !upgrade.hidden &&
      !upgrade.extension,
  );
  const definitionIndex = categoryDefinitions.findIndex(
    (upgrade) => upgrade.id === definition.id,
  );
  if (definitionIndex <= 0) return undefined;
  return categoryDefinitions
    .slice(0, definitionIndex)
    .find((upgrade) => (levels[upgrade.id] ?? 0) < upgrade.maxLevel);
}

export function hasCompletedUpgradePrerequisites(
  levels: UpgradeLevels,
  definition: UpgradeDefinition,
) {
  return !getFirstIncompleteUpgradePrerequisite(levels, definition);
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

export function isOperationalPrioritiesUnlocked(levels: UpgradeLevels): boolean {
  return getUpgradeEffectTotal(levels, "operationalPrioritiesUnlock") >= 1;
}

export function isSISTechnicianCourseUnlocked(levels: UpgradeLevels): boolean {
  return getUpgradeEffectTotal(levels, "sisTechnicianCourseUnlock") >= 1;
}

export function isCourseXUnlocked(levels: UpgradeLevels): boolean {
  return getUpgradeEffectTotal(levels, "courseXUnlock") >= 1;
}
