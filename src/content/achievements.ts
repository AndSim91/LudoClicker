import { getCareer, getCareerGadgetsSold, getCareerPerfectPhrases } from "../game/career";
import { getArchivedCompletedEventCount } from "../game/historyArchive";
import { getMonthlyNetworkRent, getReputationLevel, REPUTATION_UPGRADE_IDS } from "../game/reputation";
import type { AchievementKey, FormId, GameState } from "../game/types";
import { GAME_CONFIG } from "../game/config";
import { getCollaboratorMasteryLevel, COLLABORATOR_MASTERY_LEVELS } from "./mastery";
import { SECRET_LEGENDARIES, SECRET_LEGENDARY_IDS, type SecretLegendaryProfile } from "./secretLegendaries";

/*
 * Traguardi (piano 4.4): Xbox/PlayStation-style trophies, a collection with no
 * reward. 30 tiered achievements (bronze, silver, gold) and 10 secrets with one
 * level whose name and condition stay hidden until unlocked. They cover the
 * whole save: unlocked keys survive the prestige.
 */

export const ACHIEVEMENT_TIERS = ["bronze", "silver", "gold"] as const;
export type AchievementTier = (typeof ACHIEVEMENT_TIERS)[number];

export const ACHIEVEMENT_CATEGORIES = [
  "Posta",
  "Scuola",
  "Formazione",
  "Collaboratori",
  "Tornei",
  "Rete",
  "Leggendari",
  "Gadget",
  "Segreti",
] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

export interface TieredAchievement {
  id: string;
  category: Exclude<AchievementCategory, "Segreti">;
  title: string;
  measure: string;
  thresholds: readonly [number, number, number];
  unit?: "euro";
  value: (state: GameState) => number;
}

export interface SecretAchievement {
  id: string;
  title: string;
  description: string;
  condition: (state: GameState) => boolean;
}

const hasFormSeven = (forms: readonly FormId[]) => forms.some((form) => form.startsWith("form-7"));
const MAESTRO_LEVEL = COLLABORATOR_MASTERY_LEVELS.length - 1;

function countFormSevenMembers(state: GameState): number {
  return state.contacts.filter((contact) => contact.status === "enrolled" && hasFormSeven(contact.forms)).length +
    (state.memberGroups ?? []).reduce((total, group) => total + (hasFormSeven(group.forms) ? group.count : 0), 0);
}

function getEverEnrolledLegendaryIds(state: GameState): Set<string> {
  return new Set<string>([
    ...state.legendaryCollaborators.enrolledProfileIds,
    ...Object.keys(state.legendaryCollaborators.retainedProgress),
  ]);
}

export const TIERED_ACHIEVEMENTS: readonly TieredAchievement[] = [
  { id: "emails", category: "Posta", title: "La tastiera chiede pietà", measure: "Email inviate", thresholds: [1, 1_000, 10_000], value: (s) => s.statistics.emailsSent },
  { id: "inputs", category: "Posta", title: "Dita d'acciaio", measure: "Input di scrittura", thresholds: [1_000, 100_000, 10_000_000], value: (s) => s.statistics.inputs },
  { id: "perfect-phrases", category: "Posta", title: "Frase perfetta", measure: "Frasi perfette", thresholds: [10, 250, 5_000], value: getCareerPerfectPhrases },
  { id: "automated-writing", category: "Posta", title: "La redazione lavora per te", measure: "Caratteri scritti dai collaboratori", thresholds: [100_000, 10_000_000, 1_000_000_000], value: (s) => s.statistics.automatedCharacters },
  { id: "enrollments", category: "Scuola", title: "Porte aperte", measure: "Iscrizioni totali", thresholds: [1, 10_000, 1_000_000], value: (s) => s.statistics.membersEnrolled },
  { id: "peak-members", category: "Scuola", title: "Una scuola che respira", measure: "Record di iscritti attivi in una scuola", thresholds: [100, 10_000, 1_000_000], value: (s) => s.school.peakActiveMembers },
  { id: "trials", category: "Scuola", title: "Lezioni di prova", measure: "Prove completate", thresholds: [10, 5_000, 100_000], value: (s) => s.statistics.trialsCompleted },
  { id: "contacts", category: "Scuola", title: "Rubrica infinita", measure: "Contatti acquisiti", thresholds: [100, 10_000, 1_000_000], value: (s) => s.statistics.contactsAcquired },
  { id: "people-met", category: "Scuola", title: "Strette di mano", measure: "Persone incontrate agli eventi", thresholds: [1_000, 100_000, 10_000_000], value: (s) => s.statistics.peopleMet },
  { id: "events", category: "Scuola", title: "Sempre in piazza", measure: "Eventi completati", thresholds: [1, 500, 10_000], value: (s) => s.statistics.eventsCompleted },
  { id: "euros", category: "Scuola", title: "Bilancio in attivo", measure: "Euro guadagnati", thresholds: [10_000, 10_000_000, 10_000_000_000], unit: "euro", value: (s) => s.statistics.eurosEarned },
  { id: "followers", category: "Scuola", title: "Virale", measure: "Follower guadagnati", thresholds: [1_000, 100_000, 10_000_000], value: (s) => s.statistics.socialFollowersGained },
  { id: "maintenance", category: "Scuola", title: "Spade sempre affilate", measure: "Manutenzioni", thresholds: [1, 5_000, 100_000], value: (s) => s.statistics.maintenanceCompleted },
  { id: "forms", category: "Formazione", title: "Dalla Forma 1 alla 7", measure: "Forme completate", thresholds: [1, 1_000, 25_000], value: (s) => s.statistics.formsCompleted },
  { id: "form-seven", category: "Formazione", title: "Il cerchio si chiude", measure: "Iscritti con Forma 7 in una scuola", thresholds: [1, 50, 500], value: countFormSevenMembers },
  { id: "agonist-courses", category: "Formazione", title: "Spirito agonistico", measure: "Corsi Agonisti completati", thresholds: [10, 500, 10_000], value: (s) => getCareer(s).agonistCourses },
  { id: "collaborators", category: "Collaboratori", title: "Il Consiglio delle Onde", measure: "Collaboratori reclutati", thresholds: [1, 100, 1_000], value: (s) => s.statistics.collaboratorsRecruited },
  {
    id: "masters", category: "Collaboratori", title: "Maestri", measure: "Collaboratori al livello Maestro", thresholds: [1, 25, 250],
    value: (s) => s.collaborators.filter((collaborator) =>
      Object.values(collaborator.mastery ?? {}).some((xp) => getCollaboratorMasteryLevel(xp) >= MAESTRO_LEVEL)).length,
  },
  { id: "instructors", category: "Collaboratori", title: "Chi insegna, impara due volte", measure: "Collaboratori con attestato di Istruttore", thresholds: [1, 50, 500], value: (s) => s.collaborators.filter((collaborator) => collaborator.instructorForms.length > 0).length },
  { id: "national-titles", category: "Tornei", title: "Campione d'Italia", measure: "Titoli nazionali", thresholds: [1, 5, 20], value: (s) => getCareer(s).nationalTitles },
  { id: "champions", category: "Tornei", title: "Arena dei Campioni", measure: "Champion's Arena vinte", thresholds: [1, 3, 10], value: (s) => getCareer(s).championsWins },
  { id: "reptile", category: "Tornei", title: "Re della Superba", measure: "Reptile o Superba vinti", thresholds: [1, 3, 10], value: (s) => getCareer(s).reptileWins },
  { id: "chronicles", category: "Tornei", title: "Scrivere le Cronache", measure: "Chronicles vinte", thresholds: [1, 3, 10], value: (s) => getCareer(s).chroniclesWins },
  {
    id: "secret-legendaries", category: "Tornei", title: "Cacciatore di Segreti", measure: "Leggendari Segreti reclutati", thresholds: [1, 5, 14],
    value: (s) => {
      const everEnrolled = getEverEnrolledLegendaryIds(s);
      return SECRET_LEGENDARY_IDS.filter((id) => everEnrolled.has(id) || s.network.secretLegendaries[id]?.status === "enrolled").length;
    },
  },
  { id: "schools", category: "Rete", title: "La Rete dell'Ordine", measure: "Scuole fondate", thresholds: [1, 5, 10], value: (s) => s.network.schools.length },
  { id: "reputation", category: "Rete", title: "Nome che pesa", measure: "Punti Reputazione guadagnati", thresholds: [10, 100, 1_000], value: (s) => getCareer(s).reputationEarned },
  { id: "rent", category: "Rete", title: "Vivere di rendita", measure: "Rendita della rete al mese", thresholds: [1_000, 100_000, 10_000_000], unit: "euro", value: getMonthlyNetworkRent },
  {
    id: "maxed-upgrades", category: "Rete", title: "Al massimo", measure: "Potenziamenti Reputazione a 50 punti", thresholds: [1, 3, 6],
    value: (s) => REPUTATION_UPGRADE_IDS.filter((id) => getReputationLevel(s, id) >= GAME_CONFIG.reputationUpgradeMaxLevel).length,
  },
  { id: "ludodex", category: "Leggendari", title: "Collezionista di leggende", measure: "Leggendari iscritti almeno una volta", thresholds: [5, 15, 22], value: (s) => getEverEnrolledLegendaryIds(s).size },
  { id: "gadgets", category: "Gadget", title: "Bottega delle Onde", measure: "Gadget venduti", thresholds: [1_000, 100_000, 10_000_000], value: getCareerGadgetsSold },
];

export const SECRET_ACHIEVEMENTS: readonly SecretAchievement[] = [
  {
    id: "no-recognizable-reference", title: "Nessun riferimento legalmente riconoscibile",
    description: "Venti eventi a tema gestiti con impeccabile prudenza narrativa.",
    condition: (s) => getArchivedCompletedEventCount(s.historyArchive, "themed-event") +
      s.acquisitionEvents.filter((event) => event.definitionId === "themed-event" && event.status === "completed").length >= 20,
  },
  {
    id: "persistent-invites", title: "Dieci inviti e immutato ottimismo",
    description: "Dieci email inviate senza che nessuno abbia ancora prenotato una prova.",
    condition: (s) => s.statistics.emailsSent >= 10 && s.statistics.trialsBooked === 0,
  },
  {
    id: "guest-of-honour", title: "Ospite d'onore", description: "Andrea Simonazzi si è iscritto all'Ordine.",
    condition: (s) => getEverEnrolledLegendaryIds(s).has("andrea-simonazzi"),
  },
  {
    id: "runaway-inflation", title: "Inflazione galoppante", description: "Cinque Inflazioni di Luce sulle spade della stessa scuola.",
    condition: (s) => s.lightInflation.priceMultiplier >= 1.1 ** 5 - 1e-9,
  },
  {
    id: "abandoned-armory", title: "Armeria abbandonata", description: "Mille spade rotte nello stesso momento.",
    condition: (s) => s.equipment.damagedSwords >= 1_000,
  },
  {
    id: "all-on-the-network", title: "Tutto sulla rete", description: "Venti punti Reputazione nella rendita in una sola fondazione.",
    condition: (s) => getCareer(s).maxRentPoints >= 20,
  },
  {
    id: "back-to-the-gym", title: "Ritorno in palestra", description: "Un Leggendario Segreto già reclutato è ricomparso tra i contatti di una nuova scuola.",
    condition: (s) => s.contacts.some((contact) => contact.secretLegendaryId &&
      contact.source !== "tournament" &&
      (SECRET_LEGENDARIES[contact.secretLegendaryId] as SecretLegendaryProfile).recruitment !== "never"),
  },
  {
    id: "rocket-start", title: "Partenza a razzo", description: "Una nuova scuola fondata entro il secondo anno scolastico.",
    condition: (s) => (getCareer(s).earliestFoundationYear ?? Infinity) <= 2,
  },
  {
    id: "exodus", title: "Esodo", description: "Cento iscritti persi in un solo fine anno.",
    condition: (s) => getCareer(s).largestYearlyDeparture >= 100,
  },
  {
    id: "living-legend", title: "Leggenda vivente", description: "Un Leggendario con Forma 7 e gli attestati di Istruttore e di Tecnico.",
    condition: (s) => s.collaborators.some((collaborator) => collaborator.specialProfileId &&
      hasFormSeven(collaborator.forms) &&
      collaborator.instructorForms.length > 0 &&
      (collaborator.technicianForms?.length ?? 0) > 0),
  },
];

export const ACHIEVEMENT_TOTAL = TIERED_ACHIEVEMENTS.length * ACHIEVEMENT_TIERS.length + SECRET_ACHIEVEMENTS.length;

export function getTierKey(id: string, tier: AchievementTier): AchievementKey {
  return `${id}:${tier}`;
}

/** Highest tier reached by the value, or undefined below bronze. */
export function getReachedTier(definition: TieredAchievement, value: number): AchievementTier | undefined {
  let reached: AchievementTier | undefined;
  ACHIEVEMENT_TIERS.forEach((tier, index) => {
    if (value >= definition.thresholds[index]) reached = tier;
  });
  return reached;
}

/** Keys reached now and not unlocked yet, in catalog order. */
export function getNewAchievementKeys(state: GameState): AchievementKey[] {
  const unlocked = new Set(state.achievements);
  const keys: AchievementKey[] = [];
  for (const definition of TIERED_ACHIEVEMENTS) {
    if (unlocked.has(getTierKey(definition.id, "gold"))) continue;
    const value = definition.value(state);
    ACHIEVEMENT_TIERS.forEach((tier, index) => {
      const key = getTierKey(definition.id, tier);
      if (value >= definition.thresholds[index] && !unlocked.has(key)) keys.push(key);
    });
  }
  for (const secret of SECRET_ACHIEVEMENTS) {
    if (!unlocked.has(secret.id) && secret.condition(state)) keys.push(secret.id);
  }
  return keys;
}

const TIER_LABELS: Record<AchievementTier, string> = { bronze: "Bronzo", silver: "Argento", gold: "Oro" };

export function getAchievementTierLabel(tier: AchievementTier): string {
  return TIER_LABELS[tier];
}

/** Display name of an unlocked key: "Title · Argento", or the secret's title. */
export function describeAchievementKey(key: AchievementKey): string {
  const [id, tier] = key.split(":");
  const tiered = TIERED_ACHIEVEMENTS.find((definition) => definition.id === id);
  if (tiered && tier) return `${tiered.title} · ${TIER_LABELS[tier as AchievementTier]}`;
  return SECRET_ACHIEVEMENTS.find((secret) => secret.id === id)?.title ?? key;
}

export const ALL_ACHIEVEMENT_KEYS: readonly AchievementKey[] = [
  ...TIERED_ACHIEVEMENTS.flatMap((definition) => ACHIEVEMENT_TIERS.map((tier) => getTierKey(definition.id, tier))),
  ...SECRET_ACHIEVEMENTS.map((secret) => secret.id),
];
