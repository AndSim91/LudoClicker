import type { UpgradeId, UpgradeLevels } from "../game/types";

export type UpgradeCategory = "speed" | "charisma" | "writing" | "welcome" | "social" | "equipment" | "organization" | "instructors";
export type UpgradeEffect = "writingPower" | "eventContactsMultiplier" | "eventAttendanceMultiplier" | "bookingMultiplier" | "enrollmentMultiplier" | "socialMultiplier" | "equipmentWearReduction" | "totalSwords" | "automationMultiplier" | "incomeMultiplier" | "annualFormCapacity" | "instructorBranchCapacity" | "instructorStudentCapacity" | "instructorTeachingSpeed" | "agonistCourseTier";

export interface UpgradeDefinition {
  id: UpgradeId;
  category: UpgradeCategory;
  title: string;
  description: string;
  effectLabel: string;
  effect: UpgradeEffect;
  effectPerLevel: number;
  effectLevelCap?: number;
  additionalEffectsPerLevel?: Partial<Record<UpgradeEffect, number>>;
  baseCost: number;
  costGrowth: number;
  levelCosts?: number[];
  maxLevel: number;
  requiredHistoricMembers: number;
}

export const UPGRADE_CATEGORIES: Array<{ id: UpgradeCategory; title: string; description: string }> = [
  { id: "speed", title: "Velocità di scrittura", description: "Aumenta i caratteri prodotti da input manuale e automazione." },
  { id: "charisma", title: "Carisma", description: "Migliora pubblico, prove dimostrative e contatti durante gli eventi." },
  { id: "writing", title: "Scrittura", description: "Aumenta la probabilità che una mail generi una prova in palestra." },
  { id: "welcome", title: "Accoglienza", description: "Migliora la conversione da lezione di prova a nuovo iscritto." },
  { id: "social", title: "Social", description: "Aumenta la produzione passiva e la portata delle campagne online." },
  { id: "equipment", title: "Attrezzatura", description: "Riduce l'usura e amplia il materiale disponibile per gli eventi." },
  { id: "organization", title: "Organizzazione", description: "Migliora automazione, quote e coordinamento della scuola." },
  { id: "instructors", title: "Istruttori", description: "Amplia le armi insegnabili e il numero di allievi seguiti contemporaneamente." },
];

const GROWTH = 1.3;

const UPGRADE_CATALOG: UpgradeDefinition[] = [
  { id: "comfortable-keyboard", category: "speed", title: "Tastiera comoda", description: "Una postazione più efficace rende ogni pressione più produttiva.", effectLabel: "+0,4 caratteri per input e livello", effect: "writingPower", effectPerLevel: 0.4, baseCost: 20, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 0 },
  { id: "quick-phrases", category: "speed", title: "Frasi rapide", description: "Le formule più frequenti arrivano prima ancora di pensarle.", effectLabel: "+0,6 caratteri per input e livello", effect: "writingPower", effectPerLevel: 0.6, baseCost: 90, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 15 },
  { id: "automatic-signature", category: "speed", title: "Firma automatica", description: "La chiusura delle mail non richiede più lavoro manuale.", effectLabel: "+20% automazione e +0,8 caratteri per livello", effect: "automationMultiplier", effectPerLevel: 0.2, additionalEffectsPerLevel: { writingPower: 0.8 }, baseCost: 160, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 25 },
  { id: "smart-fields", category: "speed", title: "Campi intelligenti", description: "Nome, luogo e dettagli pratici vengono compilati più velocemente.", effectLabel: "+1 carattere per input e livello", effect: "writingPower", effectPerLevel: 1, baseCost: 280, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 40 },
  { id: "instant-review", category: "speed", title: "Revisione istantanea", description: "Manuale e collaboratori condividono una revisione rapidissima.", effectLabel: "+20% automazione e +1 carattere per livello", effect: "automationMultiplier", effectPerLevel: 0.2, additionalEffectsPerLevel: { writingPower: 1 }, baseCost: 500, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 60 },
  { id: "mail-merge", category: "speed", title: "Fusione documenti", description: "Una procedura di fine ciclo moltiplica l'intera redazione.", effectLabel: "+20% automazione e +1 carattere per livello", effect: "automationMultiplier", effectPerLevel: 0.2, additionalEffectsPerLevel: { writingPower: 1 }, baseCost: 900, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 90 },

  { id: "prepared-presentation", category: "charisma", title: "Presentazione preparata", description: "Spiegazioni più chiare trasformano incontri in contatti utili.", effectLabel: "+10% prove e contatti per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.1, baseCost: 15, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 0 },
  { id: "qr-cards", category: "charisma", title: "Biglietti con QR code", description: "Lasciare un indirizzo diventa immediato.", effectLabel: "+15% prove e contatti per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.15, baseCost: 50, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 5 },
  { id: "coordinated-demo", category: "charisma", title: "Dimostrazione coordinata", description: "Una presentazione ordinata migliora la qualità percepita.", effectLabel: "+20% persone incontrate per livello", effect: "eventAttendanceMultiplier", effectPerLevel: 0.2, baseCost: 100, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 15 },
  { id: "recognizable-stand", category: "charisma", title: "Stand riconoscibile", description: "Il pubblico capisce subito dove fermarsi.", effectLabel: "+25% persone incontrate per livello", effect: "eventAttendanceMultiplier", effectPerLevel: 0.25, baseCost: 190, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 25 },
  { id: "order-welcome", category: "charisma", title: "Accoglienza dell'Ordine", description: "La conversazione prosegue naturalmente fino allo scambio dei contatti.", effectLabel: "+15% prove e contatti per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.15, baseCost: 320, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 40 },
  { id: "difficult-questions", category: "charisma", title: "Risposte alle domande difficili", description: "Anche le domande più specifiche ricevono una risposta utile.", effectLabel: "+20% prove e contatti per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.2, baseCost: 550, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 60 },
  { id: "not-that-thing", category: "charisma", title: "No, non è esattamente quella cosa", description: "La spiegazione definitiva, sorprendentemente efficace.", effectLabel: "+30% prove e contatti per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.3, baseCost: 950, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 90 },

  { id: "spell-check", category: "writing", title: "Controllo ortografico", description: "La stessa mail viene ripulita da refusi ed errori grammaticali.", effectLabel: "+8% prenotazioni · rimuove gli errori", effect: "bookingMultiplier", effectPerLevel: 0.08, baseCost: 25, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 0 },
  { id: "professional-email", category: "writing", title: "Email professionale", description: "Firma completa, paragrafi ordinati e spaziature corrette.", effectLabel: "+12% prenotazioni · struttura professionale", effect: "bookingMultiplier", effectPerLevel: 0.12, baseCost: 60, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 5 },
  { id: "personalized-invite", category: "writing", title: "Invito personalizzato", description: "Un nuovo set di email più lunghe parla meglio alla persona contattata.", effectLabel: "+15% prenotazioni · email da 250–450 caratteri", effect: "bookingMultiplier", effectPerLevel: 0.15, baseCost: 120, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 15 },
  { id: "call-to-action", category: "writing", title: "Call to action", description: "Link e pulsanti rendono immediato il passo successivo.", effectLabel: "+15% prenotazioni · link e pulsanti", effect: "bookingMultiplier", effectPerLevel: 0.15, baseCost: 220, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 25 },
  { id: "email-layout", category: "writing", title: "Impaginazione", description: "La mail riceve una struttura CSS ordinata e riconoscibile.", effectLabel: "+10% prenotazioni · CSS fino a 600 caratteri", effect: "bookingMultiplier", effectPerLevel: 0.1, baseCost: 380, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 40 },
  { id: "winning-advertising", category: "writing", title: "Pubblicità vincente", description: "Il messaggio diventa un volantino completo con immagini e dettagli.", effectLabel: "+20% prenotazioni · volantino fino a 800 caratteri", effect: "bookingMultiplier", effectPerLevel: 0.2, baseCost: 650, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 60 },
  { id: "marketing-course", category: "writing", title: "Corso di Marketing", description: "La mail spiega lo sport per filo e per segno con una campagna completa.", effectLabel: "+35% prenotazioni · testi fino a 2.000 caratteri", effect: "bookingMultiplier", effectPerLevel: 0.35, baseCost: 1100, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 90 },

  { id: "welcome-procedure", category: "welcome", title: "Procedura di benvenuto", description: "Una prima lezione più curata facilita l'ingresso nel gruppo.", effectLabel: "+10% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.1, baseCost: 30, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 0 },
  { id: "tested-intro", category: "welcome", title: "Lezione introduttiva collaudata", description: "La sequenza iniziale funziona anche con chi parte da zero.", effectLabel: "+15% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.15, baseCost: 80, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 8 },
  { id: "clear-material", category: "welcome", title: "Materiale informativo chiaro", description: "Orari, costi e percorso sono facili da capire.", effectLabel: "+10% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.1, baseCost: 150, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 20 },
  { id: "dedicated-helper", category: "welcome", title: "Collaboratore dedicato", description: "Una persona segue ogni nuovo partecipante.", effectLabel: "+15% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.15, baseCost: 280, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 35 },
  { id: "prepared-room", category: "welcome", title: "Sala preparata", description: "Ogni dettaglio della prima esperienza è al suo posto.", effectLabel: "+20% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.2, baseCost: 500, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 55 },
  { id: "memorable-experience", category: "welcome", title: "Esperienza memorabile", description: "La lezione di prova diventa qualcosa da raccontare.", effectLabel: "+30% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.3, baseCost: 900, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 85 },

  { id: "updated-page", category: "social", title: "Pagina aggiornata", description: "Una presenza minima ma affidabile genera interesse.", effectLabel: "+15% produzione Social per livello", effect: "socialMultiplier", effectPerLevel: 0.15, baseCost: 80, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 10 },
  { id: "editorial-calendar", category: "social", title: "Calendario editoriale", description: "La pubblicazione diventa regolare.", effectLabel: "+20% produzione Social per livello", effect: "socialMultiplier", effectPerLevel: 0.2, baseCost: 140, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 15 },
  { id: "lesson-photos", category: "social", title: "Foto delle lezioni", description: "Il pubblico vede l'attività anche nelle campagne email.", effectLabel: "+25% produzione Social · sblocca logo e immagini", effect: "socialMultiplier", effectPerLevel: 0.25, baseCost: 240, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 25 },
  { id: "demo-video", category: "social", title: "Video dimostrativo", description: "Testi, dettagli, contatti e video diventano un volantino digitale.", effectLabel: "+30% produzione Social · sblocca il volantino completo", effect: "socialMultiplier", effectPerLevel: 0.3, baseCost: 400, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 40 },
  { id: "weekly-column", category: "social", title: "Rubrica settimanale", description: "L'interesse si accumula nel tempo.", effectLabel: "+35% produzione Social per livello", effect: "socialMultiplier", effectPerLevel: 0.35, baseCost: 650, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 55 },
  { id: "viral-post", category: "social", title: "Post inspiegabilmente virale", description: "Nessuno sa perché, ma continua a funzionare.", effectLabel: "+50% produzione Social per livello", effect: "socialMultiplier", effectPerLevel: 0.5, baseCost: 1000, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 75 },
  { id: "professional-management", category: "social", title: "Gestione professionale", description: "La presenza online lavora come un sistema coordinato.", effectLabel: "+20% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.2, baseCost: 1600, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 100 },

  { id: "pre-event-check", category: "equipment", title: "Controllo pre-evento", description: "I problemi vengono trovati prima di uscire.", effectLabel: "-5% usura per livello", effect: "equipmentWearReduction", effectPerLevel: 0.05, baseCost: 70, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 5 },
  { id: "maintenance-kit", category: "equipment", title: "Kit di manutenzione", description: "Le riparazioni dei collaboratori diventano più efficaci.", effectLabel: "+15% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.15, baseCost: 130, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 15 },
  { id: "organized-rack", category: "equipment", title: "Rastrelliera ordinata", description: "Più spade sono immediatamente disponibili.", effectLabel: "+2 spade per livello", effect: "totalSwords", effectPerLevel: 2, baseCost: 230, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 20 },
  { id: "essential-parts", category: "equipment", title: "Ricambi essenziali", description: "L'usura incide meno sull'operatività.", effectLabel: "-5% usura per livello", effect: "equipmentWearReduction", effectPerLevel: 0.05, baseCost: 380, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 35 },
  { id: "demo-set", category: "equipment", title: "Set da dimostrazione", description: "Gli eventi possono accogliere più persone.", effectLabel: "+15% persone agli eventi per livello", effect: "eventAttendanceMultiplier", effectPerLevel: 0.15, baseCost: 620, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 50 },
  { id: "equipment-register", category: "equipment", title: "Registro dell'attrezzatura", description: "I controlli diventano parte dell'automazione.", effectLabel: "+20% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.2, baseCost: 950, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 70 },
  { id: "all-fixed", category: "equipment", title: "Le abbiamo messe a posto tutte", description: "Una dichiarazione finalmente supportata dai fatti.", effectLabel: "-10% usura per livello", effect: "equipmentWearReduction", effectPerLevel: 0.1, baseCost: 1500, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 100 },

  { id: "shared-calendar", category: "organization", title: "Calendario condiviso", description: "Preparazione e disponibilità sono più leggibili.", effectLabel: "+20% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.2, baseCost: 100, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 10 },
  { id: "collaborator-shifts", category: "organization", title: "Turni dei collaboratori", description: "Le assegnazioni producono risultati più regolari.", effectLabel: "+40% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.4, baseCost: 200, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 20 },
  { id: "checklist", category: "organization", title: "Lista di controllo", description: "Gli imprevisti diventano eccezioni documentate.", effectLabel: "-5% usura per livello", effect: "equipmentWearReduction", effectPerLevel: 0.05, baseCost: 350, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 35 },
  { id: "registration-form", category: "organization", title: "Modulo di iscrizione", description: "Quote e registrazioni scorrono più rapidamente.", effectLabel: "+10% entrate per livello", effect: "incomeMultiplier", effectPerLevel: 0.1, baseCost: 600, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 50 },
  { id: "order-secretariat", category: "organization", title: "Segreteria dell'Ordine", description: "Notifiche, quote e pratiche seguono una procedura stabile.", effectLabel: "+20% entrate per livello", effect: "incomeMultiplier", effectPerLevel: 0.2, baseCost: 1000, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 75 },
  { id: "multi-site-coordination", category: "organization", title: "Coordinamento multi-sede", description: "La struttura è pronta a sostenere una rete di scuole.", effectLabel: "+100% automazione per livello", effect: "automationMultiplier", effectPerLevel: 1, baseCost: 1800, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 100 },

  { id: "instructor-versatility", category: "instructors", title: "Polivalenza didattica", description: "Permette agli Istruttori di apprendere rami d'arma oltre le proprie preferenze iniziali.", effectLabel: "+1 ramo d'arma accessibile per livello", effect: "instructorBranchCapacity", effectPerLevel: 1, baseCost: 2_000, costGrowth: 2, levelCosts: [2_000, 4_000], maxLevel: 2, requiredHistoricMembers: 35 },
  { id: "technical-arena", category: "instructors", title: "Arena Tecnica", description: "Sblocca il Corso Agonisti automatico per proteggere gli atleti a rischio di abbandono che non hanno altre Forme da apprendere.", effectLabel: "Livello 1: sblocco · Livello 2: 5 secondi · Livello 3: gratuito", effect: "agonistCourseTier", effectPerLevel: 1, baseCost: 2_000, costGrowth: 1, levelCosts: [2_000, 5_000, 10_000], maxLevel: 3, requiredHistoricMembers: 35 },
  { id: "promiscuous-instructor", category: "instructors", title: "Istruttore Promisquo", description: "Un'organizzazione più flessibile permette a ogni Istruttore di seguire un allievo aggiuntivo.", effectLabel: "+1 allievo contemporaneo · massimo 2", effect: "instructorStudentCapacity", effectPerLevel: 1, baseCost: 5_000, costGrowth: 1, maxLevel: 1, requiredHistoricMembers: 35 },
  { id: "extra-form", category: "instructors", title: "Extra Forma", description: "Aumenta per tutti gli atleti della scuola il numero di Forme apprendibili nello stesso anno formativo.", effectLabel: "+1 Forma apprendibile per atleta e anno", effect: "annualFormCapacity", effectPerLevel: 1, baseCost: 10_000, costGrowth: 1, maxLevel: 1, requiredHistoricMembers: 35 },
  { id: "tiamat-instructor", category: "instructors", title: "Istruttore Tiamat", description: "Una metodologia avanzata permette a ogni Istruttore di seguire più allievi nello stesso momento.", effectLabel: "+1 allievo contemporaneo per livello · massimo 6", effect: "instructorStudentCapacity", effectPerLevel: 1, baseCost: 8_000, costGrowth: 1, levelCosts: [8_000, 13_000, 21_000, 34_000], maxLevel: 4, requiredHistoricMembers: 35 },
  { id: "pagosport", category: "instructors", title: "PagoSport", description: "Amplia il piano formativo annuale e, al livello massimo, copre interamente i costi di tutte le Forme per tutti.", effectLabel: "Livelli 1–2: +1 Forma annua · Livello 3: tutte le Forme gratuite", effect: "annualFormCapacity", effectPerLevel: 1, effectLevelCap: 2, baseCost: 55_000, costGrowth: 1, levelCosts: [55_000, 89_000, 144_000], maxLevel: 3, requiredHistoricMembers: 35 },
  { id: "divine-touch", category: "instructors", title: "Tocco Divino", description: "L'insegnamento delle Forme da parte degli Istruttori raggiunge una velocità sovrumana.", effectLabel: "+9999% velocità di insegnamento", effect: "instructorTeachingSpeed", effectPerLevel: 99.99, baseCost: 1_000_000, costGrowth: 1, maxLevel: 1, requiredHistoricMembers: 35 },
];

const SHOP_BASE_COSTS: Record<UpgradeId, number> = {
  "comfortable-keyboard": 75,
  "quick-phrases": 400,
  "automatic-signature": 800,
  "smart-fields": 1_500,
  "instant-review": 2_750,
  "mail-merge": 5_000,
  "prepared-presentation": 50,
  "qr-cards": 150,
  "coordinated-demo": 400,
  "recognizable-stand": 800,
  "order-welcome": 1_500,
  "difficult-questions": 2_750,
  "not-that-thing": 5_000,
  "spell-check": 75,
  "professional-email": 175,
  "personalized-invite": 175,
  "call-to-action": 400,
  "email-layout": 850,
  "winning-advertising": 1_600,
  "marketing-course": 3_000,
  "welcome-procedure": 75,
  "tested-intro": 250,
  "clear-material": 700,
  "dedicated-helper": 1_300,
  "prepared-room": 2_500,
  "memorable-experience": 5_000,
  "updated-page": 250,
  "editorial-calendar": 400,
  "lesson-photos": 750,
  "demo-video": 1_500,
  "weekly-column": 2_500,
  "viral-post": 4_000,
  "professional-management": 6_500,
  "pre-event-check": 150,
  "maintenance-kit": 400,
  "organized-rack": 750,
  "essential-parts": 1_300,
  "demo-set": 2_500,
  "equipment-register": 4_000,
  "all-fixed": 6_500,
  "shared-calendar": 250,
  "collaborator-shifts": 700,
  checklist: 1_300,
  "registration-form": 2_500,
  "order-secretariat": 4_000,
  "multi-site-coordination": 6_500,
  "instructor-versatility": 2_000,
  "technical-arena": 2_000,
  "promiscuous-instructor": 5_000,
  "extra-form": 10_000,
  "tiamat-instructor": 8_000,
  pagosport: 55_000,
  "divine-touch": 1_000_000,
};

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = UPGRADE_CATALOG.map(
  (definition) => ({ ...definition, baseCost: SHOP_BASE_COSTS[definition.id] }),
);

export function createInitialUpgradeLevels(): UpgradeLevels {
  return Object.fromEntries(UPGRADE_DEFINITIONS.map((definition) => [definition.id, 0])) as UpgradeLevels;
}

export function getUpgradeDefinition(id: UpgradeId) {
  return UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === id);
}

export function getFirstIncompleteUpgradePrerequisite(
  levels: UpgradeLevels,
  definition: UpgradeDefinition,
) {
  const categoryDefinitions = UPGRADE_DEFINITIONS.filter(
    (upgrade) => upgrade.category === definition.category,
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

export function getUpgradeCost(definition: UpgradeDefinition, currentLevel: number, networkSchools = 0) {
  const localCost = definition.levelCosts?.[currentLevel] ??
    definition.baseCost * definition.costGrowth ** currentLevel;
  return Math.round(
    localCost * (1 + networkSchools * 0.15),
  );
}

export function getUpgradeEffectTotal(levels: UpgradeLevels, effect: UpgradeEffect): number {
  return UPGRADE_DEFINITIONS.reduce((total, definition) => {
    const effectPerLevel =
      (definition.effect === effect ? definition.effectPerLevel : 0) +
      (definition.additionalEffectsPerLevel?.[effect] ?? 0);
    const effectiveLevel = Math.min(
      levels[definition.id] ?? 0,
      definition.effectLevelCap ?? definition.maxLevel,
    );
    return total + effectiveLevel * effectPerLevel;
  }, 0);
}

export function getUpgradeEffectMaximum(effect: UpgradeEffect): number {
  return UPGRADE_DEFINITIONS.reduce((total, definition) => {
    const effectPerLevel =
      (definition.effect === effect ? definition.effectPerLevel : 0) +
      (definition.additionalEffectsPerLevel?.[effect] ?? 0);
    return total + Math.min(
      definition.maxLevel,
      definition.effectLevelCap ?? definition.maxLevel,
    ) * effectPerLevel;
  }, 0);
}

export function getAnnualFormTrainingLimit(levels: UpgradeLevels): number {
  return 1 + getUpgradeEffectTotal(levels, "annualFormCapacity");
}

export function hasFreeFormTraining(levels: UpgradeLevels): boolean {
  return (levels.pagosport ?? 0) >= 3;
}
