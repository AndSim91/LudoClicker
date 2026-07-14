import type { UpgradeId, UpgradeLevels } from "../game/types";

export type UpgradeCategory = "speed" | "charisma" | "writing" | "welcome" | "social" | "equipment" | "organization";
export type UpgradeEffect = "writingPower" | "eventContactsMultiplier" | "eventAttendanceMultiplier" | "bookingMultiplier" | "enrollmentMultiplier" | "socialMultiplier" | "equipmentWearReduction" | "totalSwords" | "automationMultiplier" | "incomeMultiplier";

export interface UpgradeDefinition {
  id: UpgradeId;
  category: UpgradeCategory;
  title: string;
  description: string;
  effectLabel: string;
  effect: UpgradeEffect;
  effectPerLevel: number;
  baseCost: number;
  costGrowth: number;
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
];

const GROWTH = 1.25;

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
  { id: "comfortable-keyboard", category: "speed", title: "Tastiera comoda", description: "Una postazione più efficace rende ogni pressione più produttiva.", effectLabel: "+1 carattere per input e livello", effect: "writingPower", effectPerLevel: 1, baseCost: 20, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 0 },
  { id: "outlook-templates", category: "speed", title: "Modelli di Outlook", description: "Blocchi di testo pronti accelerano ogni campagna.", effectLabel: "+1 carattere per input e livello", effect: "writingPower", effectPerLevel: 1, baseCost: 45, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 5 },
  { id: "quick-phrases", category: "speed", title: "Frasi rapide", description: "Le formule più frequenti arrivano prima ancora di pensarle.", effectLabel: "+2 caratteri per input e livello", effect: "writingPower", effectPerLevel: 2, baseCost: 90, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 15 },
  { id: "automatic-signature", category: "speed", title: "Firma automatica", description: "La chiusura delle mail non richiede più lavoro manuale.", effectLabel: "+10% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.1, baseCost: 160, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 25 },
  { id: "smart-fields", category: "speed", title: "Campi intelligenti", description: "Nome, luogo e dettagli pratici vengono compilati più velocemente.", effectLabel: "+3 caratteri per input e livello", effect: "writingPower", effectPerLevel: 3, baseCost: 280, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 40 },
  { id: "instant-review", category: "speed", title: "Revisione istantanea", description: "Manuale e collaboratori condividono una revisione rapidissima.", effectLabel: "+15% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.15, baseCost: 500, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 60 },
  { id: "mail-merge", category: "speed", title: "Fusione documenti", description: "Una procedura di fine ciclo moltiplica l'intera redazione.", effectLabel: "+25% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.25, baseCost: 900, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 90 },

  { id: "prepared-presentation", category: "charisma", title: "Presentazione preparata", description: "Spiegazioni più chiare trasformano incontri in contatti utili.", effectLabel: "+10% prove e contatti per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.1, baseCost: 15, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 0 },
  { id: "qr-cards", category: "charisma", title: "Biglietti con QR code", description: "Lasciare un indirizzo diventa immediato.", effectLabel: "+15% prove e contatti per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.15, baseCost: 50, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 5 },
  { id: "coordinated-demo", category: "charisma", title: "Dimostrazione coordinata", description: "Una presentazione ordinata migliora la qualità percepita.", effectLabel: "+20% persone incontrate per livello", effect: "eventAttendanceMultiplier", effectPerLevel: 0.2, baseCost: 100, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 15 },
  { id: "recognizable-stand", category: "charisma", title: "Stand riconoscibile", description: "Il pubblico capisce subito dove fermarsi.", effectLabel: "+25% persone incontrate per livello", effect: "eventAttendanceMultiplier", effectPerLevel: 0.25, baseCost: 190, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 25 },
  { id: "order-welcome", category: "charisma", title: "Accoglienza dell'Ordine", description: "La conversazione prosegue naturalmente fino allo scambio dei contatti.", effectLabel: "+15% prove e contatti per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.15, baseCost: 320, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 40 },
  { id: "difficult-questions", category: "charisma", title: "Risposte alle domande difficili", description: "Anche le domande più specifiche ricevono una risposta utile.", effectLabel: "+20% prove e contatti per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.2, baseCost: 550, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 60 },
  { id: "not-that-thing", category: "charisma", title: "No, non è esattamente quella cosa", description: "La spiegazione definitiva, sorprendentemente efficace.", effectLabel: "+30% prove e contatti per livello", effect: "eventContactsMultiplier", effectPerLevel: 0.3, baseCost: 950, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 90 },

  { id: "clear-subject", category: "writing", title: "Oggetto chiaro", description: "Un invito comprensibile riceve più conferme.", effectLabel: "+8% prenotazioni per livello", effect: "bookingMultiplier", effectPerLevel: 0.08, baseCost: 25, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 0 },
  { id: "personalized-invite", category: "writing", title: "Invito personalizzato", description: "Il messaggio sembra scritto proprio per il destinatario.", effectLabel: "+12% prenotazioni per livello", effect: "bookingMultiplier", effectPerLevel: 0.12, baseCost: 60, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 5 },
  { id: "call-to-action", category: "writing", title: "Call to action", description: "Il passo successivo è impossibile da fraintendere.", effectLabel: "+15% prenotazioni per livello", effect: "bookingMultiplier", effectPerLevel: 0.15, baseCost: 120, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 15 },
  { id: "collective-review", category: "writing", title: "Revisione collettiva", description: "Più occhi rendono il testo più convincente e rapido.", effectLabel: "+10% prenotazioni per livello", effect: "bookingMultiplier", effectPerLevel: 0.1, baseCost: 220, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 25 },
  { id: "testimonials", category: "writing", title: "Testimonianze", description: "Esperienze autentiche riducono l'incertezza.", effectLabel: "+20% prenotazioni per livello", effect: "bookingMultiplier", effectPerLevel: 0.2, baseCost: 380, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 40 },
  { id: "convincing-paragraph", category: "writing", title: "Il paragrafo che convince davvero", description: "Finalmente il paragrafo che tutti cercavano.", effectLabel: "+25% prenotazioni per livello", effect: "bookingMultiplier", effectPerLevel: 0.25, baseCost: 650, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 60 },
  { id: "honest-advertising", category: "writing", title: "Pubblicità sorprendentemente onesta", description: "Nessuna promessa impossibile, soltanto un invito molto efficace.", effectLabel: "+35% prenotazioni per livello", effect: "bookingMultiplier", effectPerLevel: 0.35, baseCost: 1100, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 90 },

  { id: "welcome-procedure", category: "welcome", title: "Procedura di benvenuto", description: "Una prima lezione più curata facilita l'ingresso nel gruppo.", effectLabel: "+10% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.1, baseCost: 30, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 0 },
  { id: "tested-intro", category: "welcome", title: "Lezione introduttiva collaudata", description: "La sequenza iniziale funziona anche con chi parte da zero.", effectLabel: "+15% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.15, baseCost: 80, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 8 },
  { id: "clear-material", category: "welcome", title: "Materiale informativo chiaro", description: "Orari, costi e percorso sono facili da capire.", effectLabel: "+10% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.1, baseCost: 150, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 20 },
  { id: "dedicated-helper", category: "welcome", title: "Collaboratore dedicato", description: "Una persona segue ogni nuovo partecipante.", effectLabel: "+15% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.15, baseCost: 280, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 35 },
  { id: "prepared-room", category: "welcome", title: "Sala preparata", description: "Ogni dettaglio della prima esperienza è al suo posto.", effectLabel: "+20% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.2, baseCost: 500, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 55 },
  { id: "memorable-experience", category: "welcome", title: "Esperienza memorabile", description: "La lezione di prova diventa qualcosa da raccontare.", effectLabel: "+30% iscrizioni per livello", effect: "enrollmentMultiplier", effectPerLevel: 0.3, baseCost: 900, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 85 },

  { id: "updated-page", category: "social", title: "Pagina aggiornata", description: "Una presenza minima ma affidabile genera interesse.", effectLabel: "+15% produzione Social per livello", effect: "socialMultiplier", effectPerLevel: 0.15, baseCost: 80, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 10 },
  { id: "editorial-calendar", category: "social", title: "Calendario editoriale", description: "La pubblicazione diventa regolare.", effectLabel: "+20% produzione Social per livello", effect: "socialMultiplier", effectPerLevel: 0.2, baseCost: 140, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 15 },
  { id: "lesson-photos", category: "social", title: "Foto delle lezioni", description: "Il pubblico comprende meglio l'attività.", effectLabel: "+25% produzione Social per livello", effect: "socialMultiplier", effectPerLevel: 0.25, baseCost: 240, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 25 },
  { id: "demo-video", category: "social", title: "Video dimostrativo", description: "La portata cresce oltre la rete abituale.", effectLabel: "+30% produzione Social per livello", effect: "socialMultiplier", effectPerLevel: 0.3, baseCost: 400, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 40 },
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

  { id: "shared-calendar", category: "organization", title: "Calendario condiviso", description: "Preparazione e disponibilità sono più leggibili.", effectLabel: "+10% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.1, baseCost: 100, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 10 },
  { id: "collaborator-shifts", category: "organization", title: "Turni dei collaboratori", description: "Le assegnazioni producono risultati più regolari.", effectLabel: "+15% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.15, baseCost: 200, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 20 },
  { id: "checklist", category: "organization", title: "Lista di controllo", description: "Gli imprevisti diventano eccezioni documentate.", effectLabel: "-5% usura per livello", effect: "equipmentWearReduction", effectPerLevel: 0.05, baseCost: 350, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 35 },
  { id: "registration-form", category: "organization", title: "Modulo di iscrizione", description: "Quote e registrazioni scorrono più rapidamente.", effectLabel: "+10% entrate per livello", effect: "incomeMultiplier", effectPerLevel: 0.1, baseCost: 600, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 50 },
  { id: "order-secretariat", category: "organization", title: "Segreteria dell'Ordine", description: "Notifiche, quote e pratiche seguono una procedura stabile.", effectLabel: "+20% entrate per livello", effect: "incomeMultiplier", effectPerLevel: 0.2, baseCost: 1000, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 75 },
  { id: "multi-site-coordination", category: "organization", title: "Coordinamento multi-sede", description: "La struttura è pronta a sostenere una rete di scuole.", effectLabel: "+30% automazione per livello", effect: "automationMultiplier", effectPerLevel: 0.3, baseCost: 1800, costGrowth: GROWTH, maxLevel: 5, requiredHistoricMembers: 100 },
];

export function createInitialUpgradeLevels(): UpgradeLevels {
  return Object.fromEntries(UPGRADE_DEFINITIONS.map((definition) => [definition.id, 0])) as UpgradeLevels;
}

export function getUpgradeDefinition(id: UpgradeId) {
  return UPGRADE_DEFINITIONS.find((upgrade) => upgrade.id === id);
}

export function getUpgradeCost(definition: UpgradeDefinition, currentLevel: number) {
  return Math.round(definition.baseCost * definition.costGrowth ** currentLevel);
}

export function getUpgradeEffectTotal(levels: UpgradeLevels, effect: UpgradeEffect): number {
  return UPGRADE_DEFINITIONS.reduce((total, definition) => definition.effect === effect ? total + (levels[definition.id] ?? 0) * definition.effectPerLevel : total, 0);
}
