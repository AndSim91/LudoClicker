import type {
  PersonRarity,
  TournamentDiscipline,
  TournamentLevel,
  TournamentRewardBonus,
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
  Record<1 | 2 | 3, { euros: number; contacts: number; bonus: TournamentRewardBonus }>
> = {
  academy: {
    1: { euros: 1_000, contacts: 0, bonus: { kind: "trial", rarity: "ultra-rare" } },
    2: { euros: 500, contacts: 0, bonus: { kind: "email", rarity: "ultra-rare" } },
    3: { euros: 250, contacts: 1, bonus: { kind: "random-contacts", amount: 1 } },
  },
  national: {
    1: { euros: 5_000, contacts: 0, bonus: { kind: "trial", rarity: "ultra-rare" } },
    2: { euros: 2_500, contacts: 0, bonus: { kind: "email", rarity: "ultra-rare" } },
    3: { euros: 1_250, contacts: 1, bonus: { kind: "random-contacts", amount: 1 } },
  },
  champions: {
    1: { euros: 50_000, contacts: 0, bonus: { kind: "enrollment", rarity: "legendary" } },
    2: { euros: 25_000, contacts: 0, bonus: { kind: "trial", rarity: "legendary" } },
    3: { euros: 12_500, contacts: 0, bonus: { kind: "email", rarity: "legendary" } },
  },
};

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
