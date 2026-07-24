import type {
  PersonRarity,
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
  chronicles: {
    id: "chronicles",
    label: "Chronicles of Ludosport",
    calendarMonth: 0,
    fieldSize: 64,
    standard: 1_000,
  },
};

export const TOURNAMENT_LEVEL_ORDER: readonly TournamentLevel[] = [
  "school",
  "academy",
  "national",
  "champions",
];

export const TOURNAMENT_REWARDS: Record<
  Exclude<TournamentLevel, "school" | "chronicles">,
  Record<1 | 2 | 3, { euros: number; followers: number; contacts: number }>
> = {
  academy: {
    1: { euros: 500, followers: 5, contacts: 0 },
    2: { euros: 250, followers: 2, contacts: 0 },
    3: { euros: 250, followers: 1, contacts: 0 },
  },
  national: {
    1: { euros: 2_500, followers: 10, contacts: 0 },
    2: { euros: 1_250, followers: 5, contacts: 0 },
    3: { euros: 700, followers: 3, contacts: 0 },
  },
  champions: {
    1: { euros: 10_000, followers: 15, contacts: 0 },
    2: { euros: 5_000, followers: 10, contacts: 0 },
    3: { euros: 2_500, followers: 5, contacts: 0 },
  },
};

export function getNextTournamentLevel(level: TournamentLevel): TournamentLevel | undefined {
  const index = TOURNAMENT_LEVEL_ORDER.indexOf(level);
  return index >= 0 ? TOURNAMENT_LEVEL_ORDER[index + 1] : undefined;
}

export function getTournamentReward(
  level: TournamentLevel,
  discipline: TournamentDiscipline,
  position: 1 | 2 | 3,
) {
  if (level === "school" || level === "chronicles") {
    return { discipline, position, euros: 0, followers: 0, contacts: 0 };
  }
  return { discipline, position, ...TOURNAMENT_REWARDS[level][position] };
}
