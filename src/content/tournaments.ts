import type {
  PersonRarity,
  SecretLegendaryId,
  TournamentDiscipline,
  TournamentLevel,
} from "../game/types";

export interface TournamentTier {
  id: "ordinary" | "contender" | "favorite" | "elite";
  baseSlots: number;
  minimum: number;
  maximum: number;
}

export interface TournamentNpcProfile {
  rarityWeights: readonly [Exclude<PersonRarity, "legendary">, number][];
  formWeights: readonly [number, number][];
  experienceRange: readonly [number, number];
  tiers: readonly TournamentTier[];
}

export interface TournamentDefinition {
  id: TournamentLevel;
  label: string;
  calendarMonth: number;
  fieldSize?: number;
  standard: number;
  npc?: TournamentNpcProfile;
}

const BASE_TIER_SLOTS = [30, 18, 8, 2] as const;

export const TOURNAMENT_DEFINITIONS: Record<TournamentLevel, TournamentDefinition> = {
  school: {
    id: "school",
    label: "Torneo Scolastico",
    calendarMonth: 12,
    standard: 0,
  },
  academy: {
    id: "academy",
    label: "Torneo Accademico Alpha",
    calendarMonth: 4,
    fieldSize: 64,
    standard: 125,
    npc: {
      rarityWeights: [["common", 0.65], ["rare", 0.30], ["ultra-rare", 0.05]],
      formWeights: [[1, 0.20], [2, 0.40], [3, 0.30], [4, 0.10]],
      experienceRange: [1, 6],
      tiers: [
        { id: "ordinary", baseSlots: BASE_TIER_SLOTS[0], minimum: 55, maximum: 94 },
        { id: "contender", baseSlots: BASE_TIER_SLOTS[1], minimum: 95, maximum: 119 },
        { id: "favorite", baseSlots: BASE_TIER_SLOTS[2], minimum: 120, maximum: 139 },
        { id: "elite", baseSlots: BASE_TIER_SLOTS[3], minimum: 140, maximum: 155 },
      ],
    },
  },
  national: {
    id: "national",
    label: "Torneo Nazionale",
    calendarMonth: 6,
    fieldSize: 64,
    standard: 150,
    npc: {
      rarityWeights: [["common", 0.35], ["rare", 0.50], ["ultra-rare", 0.15]],
      formWeights: [[3, 0.10], [4, 0.35], [5, 0.40], [6, 0.15]],
      experienceRange: [5, 14],
      tiers: [
        { id: "ordinary", baseSlots: BASE_TIER_SLOTS[0], minimum: 75, maximum: 114 },
        { id: "contender", baseSlots: BASE_TIER_SLOTS[1], minimum: 115, maximum: 144 },
        { id: "favorite", baseSlots: BASE_TIER_SLOTS[2], minimum: 145, maximum: 169 },
        { id: "elite", baseSlots: BASE_TIER_SLOTS[3], minimum: 170, maximum: 185 },
      ],
    },
  },
  champions: {
    id: "champions",
    label: "Champion's Arena",
    calendarMonth: 11,
    fieldSize: 64,
    standard: 200,
    npc: {
      rarityWeights: [["common", 0.40], ["rare", 0.52], ["ultra-rare", 0.08]],
      formWeights: [[4, 0.18], [5, 0.38], [6, 0.33], [7, 0.11]],
      experienceRange: [7, 17],
      tiers: [
        { id: "ordinary", baseSlots: BASE_TIER_SLOTS[0], minimum: 100, maximum: 154 },
        { id: "contender", baseSlots: BASE_TIER_SLOTS[1], minimum: 155, maximum: 189 },
        { id: "favorite", baseSlots: BASE_TIER_SLOTS[2], minimum: 190, maximum: 214 },
        { id: "elite", baseSlots: BASE_TIER_SLOTS[3], minimum: 215, maximum: 230 },
      ],
    },
  },
};

export const TOURNAMENT_LEVEL_ORDER: readonly TournamentLevel[] = [
  "school",
  "academy",
  "national",
  "champions",
];

export const TOURNAMENT_REWARDS: Record<
  Exclude<TournamentLevel, "school">,
  Record<1 | 2 | 3, { euros: number; contacts: number }>
> = {
  academy: {
    1: { euros: 500, contacts: 10 },
    2: { euros: 250, contacts: 6 },
    3: { euros: 100, contacts: 3 },
  },
  national: {
    1: { euros: 2_000, contacts: 30 },
    2: { euros: 1_000, contacts: 15 },
    3: { euros: 500, contacts: 8 },
  },
  champions: {
    1: { euros: 8_000, contacts: 100 },
    2: { euros: 4_000, contacts: 50 },
    3: { euros: 2_000, contacts: 25 },
  },
};

export interface TournamentSchool {
  name: string;
  city: string;
  nation: string;
  academy?: string;
}

// Fotografia locale delle sedi pubbliche consultate nel luglio 2026.
export const ALPHA_SCHOOLS: readonly TournamentSchool[] = [
  { name: "Ordine della Cripta", city: "Milano", nation: "Italia", academy: "Alpha" },
  { name: "Ordine della Cripta", city: "Monza", nation: "Italia", academy: "Alpha" },
  { name: "Ordine degli Elementi", city: "Torino", nation: "Italia", academy: "Alpha" },
  { name: "Ordine delle Onde", city: "Genova", nation: "Italia", academy: "Alpha" },
  { name: "Ordine della Spirale", city: "Padova", nation: "Italia", academy: "Alpha" },
  { name: "Ordine di Minerva", city: "Pavia", nation: "Italia", academy: "Alpha" },
  { name: "Ordine dell'Equilibrio", city: "Pordenone", nation: "Italia", academy: "Alpha" },
  { name: "Ordine del Vento", city: "Trieste", nation: "Italia", academy: "Alpha" },
  { name: "Ordine degli Shardana", city: "Cagliari", nation: "Italia", academy: "Alpha" },
  { name: "Ordine della Loggia", city: "Brescia", nation: "Italia", academy: "Alpha" },
  { name: "Scuola di Vicenza", city: "Vicenza", nation: "Italia", academy: "Alpha" },
  { name: "Ordine delle Mura", city: "Bergamo", nation: "Italia", academy: "Alpha" },
  { name: "Ordine dei Ronin", city: "Ravenna", nation: "Italia", academy: "Alpha" },
  { name: "Ordine dei Ronin", city: "Cesena", nation: "Italia", academy: "Alpha" },
];

export const ITALIAN_SCHOOLS: readonly TournamentSchool[] = [
  ...ALPHA_SCHOOLS,
  ...[
    "Busto Arsizio", "Magenta", "Varese", "Conegliano", "Rovigo", "Treviso",
    "Bologna", "Ferrara", "Formigine", "Modena", "Reggio Emilia", "Firenze",
    "Pisa", "Livorno", "Ponsacco", "Roma EUR", "Roma Africano", "Bracciano",
    "Caserta", "Napoli",
  ].map((city) => ({ name: `LudoSport ${city}`, city, nation: "Italia" })),
];

export const GLOBAL_SCHOOLS: readonly TournamentSchool[] = [
  ...ITALIAN_SCHOOLS,
  { name: "LudoSport Paris", city: "Parigi", nation: "Francia" },
  { name: "LudoSport Madrid", city: "Madrid", nation: "Spagna" },
  { name: "LudoSport Barcelona", city: "Barcellona", nation: "Spagna" },
  { name: "LudoSport Berlin", city: "Berlino", nation: "Germania" },
  { name: "LudoSport Dublin", city: "Dublino", nation: "Irlanda" },
  { name: "LudoSport Brussels", city: "Bruxelles", nation: "Belgio" },
  { name: "LudoSport London", city: "Londra", nation: "Regno Unito" },
  { name: "LudoSport San Francisco", city: "San Francisco", nation: "Stati Uniti" },
  { name: "LudoSport Boston", city: "Boston", nation: "Stati Uniti" },
  { name: "LudoSport Lima", city: "Lima", nation: "Perù" },
];

export interface SecretLegendaryProfile {
  id: SecretLegendaryId;
  firstName: string;
  lastName: string;
  city: string;
  academy: string;
  schoolName: string;
  arenaBase: number;
  styleBase: number;
  numericForms: number;
  externalExperience: number;
  specialty: "style" | "complete";
}

export const SECRET_LEGENDARIES: Record<SecretLegendaryId, SecretLegendaryProfile> = {
  "marco-palena": {
    id: "marco-palena",
    firstName: "Marco",
    lastName: "Palena",
    city: "Torino",
    academy: "Alpha",
    schoolName: "Ordine degli Elementi",
    arenaBase: 75,
    styleBase: 90,
    numericForms: 4,
    externalExperience: 5,
    specialty: "style",
  },
  "lorenzo-todaro": {
    id: "lorenzo-todaro",
    firstName: "Lorenzo",
    lastName: "Todaro",
    city: "Milano",
    academy: "Alpha",
    schoolName: "Ordine della Cripta",
    arenaBase: 80,
    styleBase: 80,
    numericForms: 5,
    externalExperience: 5,
    specialty: "complete",
  },
};

export const SECRET_LEGENDARY_APPEARANCE_CHANCE = 0.1;

export function getNpcSchoolPool(level: TournamentLevel): readonly TournamentSchool[] {
  if (level === "academy") return ALPHA_SCHOOLS;
  if (level === "national") return ITALIAN_SCHOOLS;
  return GLOBAL_SCHOOLS;
}

export function getNextTournamentLevel(level: TournamentLevel): TournamentLevel | undefined {
  const index = TOURNAMENT_LEVEL_ORDER.indexOf(level);
  return TOURNAMENT_LEVEL_ORDER[index + 1];
}

export function getTournamentReward(
  level: TournamentLevel,
  discipline: TournamentDiscipline,
  position: 1 | 2 | 3,
) {
  if (level === "school") return { discipline, position, euros: 0, contacts: 0 };
  return { discipline, position, ...TOURNAMENT_REWARDS[level][position] };
}
