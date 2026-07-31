import type { GadgetProductId, GadgetRarity } from "../game/types";
import { GADGET_RARITIES } from "./gadgetRarities";

export interface GadgetDefinition {
  id: GadgetProductId;
  name: string;
  description: string;
  projectCost: number;
  unitProfitAtMaxQuality: number;
  developmentWorkMs: number;
  revisionCost: number;
  premiumOnly?: boolean;
  previousProductId?: GadgetProductId;
}

const MINUTE = 60_000;

export const GADGET_PRODUCT_ORDER: readonly GadgetProductId[] = [
  "keychain",
  "sticker-set",
  "wristband",
  "mug",
  "tshirt",
  "cap",
  "underwear",
  "sports-tshirt",
  "hoodie",
  "custom-hilt",
];

export const GADGET_DEFINITIONS: Record<GadgetProductId, GadgetDefinition> = {
  keychain: {
    id: "keychain",
    name: "Portachiavi",
    description: "Il primo prodotto ufficiale della scuola.",
    projectCost: 1_000,
    unitProfitAtMaxQuality: 5,
    developmentWorkMs: 10 * MINUTE,
    revisionCost: 100,
  },
  "sticker-set": {
    id: "sticker-set",
    name: "Set di Adesivi",
    description: "Un piccolo set per portare il simbolo della scuola ovunque.",
    projectCost: 2_000,
    unitProfitAtMaxQuality: 10,
    developmentWorkMs: 30 * MINUTE,
    revisionCost: 250,
    previousProductId: "keychain",
  },
  wristband: {
    id: "wristband",
    name: "Polsino",
    description: "Un accessorio sportivo essenziale e riconoscibile.",
    projectCost: 5_000,
    unitProfitAtMaxQuality: 15,
    developmentWorkMs: 60 * MINUTE,
    revisionCost: 500,
    previousProductId: "sticker-set",
  },
  mug: {
    id: "mug",
    name: "Tazza",
    description: "Un gadget semplice, adatto a un pubblico più ampio.",
    projectCost: 10_000,
    unitProfitAtMaxQuality: 20,
    developmentWorkMs: 75 * MINUTE,
    revisionCost: 1_000,
    previousProductId: "wristband",
  },
  tshirt: {
    id: "tshirt",
    name: "Maglietta",
    description: "Il prodotto centrale della linea della scuola.",
    projectCost: 15_000,
    unitProfitAtMaxQuality: 30,
    developmentWorkMs: 90 * MINUTE,
    revisionCost: 1_500,
    previousProductId: "mug",
  },
  cap: {
    id: "cap",
    name: "Cappellino",
    description: "Un capo leggero da indossare durante allenamenti ed eventi.",
    projectCost: 20_000,
    unitProfitAtMaxQuality: 35,
    developmentWorkMs: 100 * MINUTE,
    revisionCost: 2_000,
    previousProductId: "tshirt",
  },
  underwear: {
    id: "underwear",
    name: "Mutande",
    description: "Un boxer sportivo tecnico per allenamento e tempo libero.",
    projectCost: 25_000,
    unitProfitAtMaxQuality: 20,
    developmentWorkMs: 120 * MINUTE,
    revisionCost: 2_500,
    previousProductId: "cap",
  },
  "sports-tshirt": {
    id: "sports-tshirt",
    name: "Maglietta Sportiva",
    description: "Una maglia tecnica pensata per l'attività sportiva.",
    projectCost: 30_000,
    unitProfitAtMaxQuality: 35,
    developmentWorkMs: 120 * MINUTE,
    revisionCost: 3_000,
    previousProductId: "underwear",
  },
  hoodie: {
    id: "hoodie",
    name: "Felpa",
    description: "Il progetto più impegnativo del catalogo base.",
    projectCost: 40_000,
    unitProfitAtMaxQuality: 40,
    developmentWorkMs: 150 * MINUTE,
    revisionCost: 4_000,
    previousProductId: "sports-tshirt",
  },
  "custom-hilt": {
    id: "custom-hilt",
    name: "Elsa personalizzata",
    description: "Una lavorazione esclusiva e personalizzata per il pubblico premium.",
    projectCost: 50_000,
    unitProfitAtMaxQuality: 100,
    developmentWorkMs: 300 * MINUTE,
    revisionCost: 5_000,
    premiumOnly: true,
    previousProductId: "hoodie",
  },
};

export const GADGET_PROJECT_UNLOCK_SALES = 100;
export const GADGET_REVISION_WORK_RATE = 1 / 3;
export const GADGET_BASE_ATTEMPTS_PER_MONTH_PER_PRODUCTIVITY = 2;
export const GADGET_EXTRA_SALES_SPEED_MULTIPLIER = 0.3;

export const GADGET_MEMBER_REACH_LEVELS = [0.1, 0.2, 0.35, 0.5, 0.75, 1] as const;
export const GADGET_FOLLOWER_REACH_LEVELS = [
  0, 0.01, 0.03, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1,
] as const;

export const GADGET_QUALITY_CONVERSION_ANCHORS = [
  { quality: 0, conversion: 0 },
  { quality: 25, conversion: 0.5 },
  { quality: 50, conversion: 0.75 },
  { quality: 75, conversion: 0.9 },
  { quality: 100, conversion: 1 },
] as const;

export const GADGET_MINIGAME_CONFIG = {
  countdownMs: 3_000,
  durationMs: 20_000,
  noteCount: 18,
  firstTargetMs: 1_400,
  lastTargetMs: 19_000,
  targetPositionPercent: 82,
  timingWindows: {
    perfectMs: 100,
    goodMs: 200,
    almostMs: 320,
  },
  points: {
    perfect: 100,
    good: 70,
    almost: 40,
    miss: 0,
  },
} as const;

export interface GadgetMinigameDifficulty {
  noteCount: number;
  travelMs: number;
  chordChance: number;
  minimumChordGroups: number;
}

export const GADGET_MINIGAME_DIFFICULTIES = {
  common: {
    noteCount: 18,
    travelMs: 3_400,
    chordChance: 0,
    minimumChordGroups: 0,
  },
  rare: {
    noteCount: 24,
    travelMs: 2_900,
    chordChance: 0,
    minimumChordGroups: 0,
  },
  "ultra-rare": {
    noteCount: 30,
    travelMs: 2_400,
    chordChance: 0.12,
    minimumChordGroups: 1,
  },
  legendary: {
    noteCount: 36,
    travelMs: 1_900,
    chordChance: 0.25,
    minimumChordGroups: 3,
  },
  "secret-legendary": {
    noteCount: 44,
    travelMs: 1_500,
    chordChance: 0.4,
    minimumChordGroups: 5,
  },
} as const satisfies Record<GadgetRarity, GadgetMinigameDifficulty>;

export function getNextGadgetProductId(productId: GadgetProductId): GadgetProductId | undefined {
  const index = GADGET_PRODUCT_ORDER.indexOf(productId);
  return index >= 0 ? GADGET_PRODUCT_ORDER[index + 1] : undefined;
}

export function getGadgetRevisionCost(
  productId: GadgetProductId,
  rarity: GadgetRarity = "common",
): number {
  return Math.round(
    GADGET_DEFINITIONS[productId].revisionCost *
      GADGET_RARITIES[rarity].revisionMultiplier,
  );
}

export function getGadgetWorkRequirement(
  productId: GadgetProductId,
  kind: "development" | "revision",
  rarity: GadgetRarity = "common",
): number {
  const base = GADGET_DEFINITIONS[productId].developmentWorkMs;
  return kind === "revision"
    ? base * GADGET_REVISION_WORK_RATE * GADGET_RARITIES[rarity].revisionMultiplier
    : base;
}
