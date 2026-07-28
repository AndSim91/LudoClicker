import type { GadgetProductId, GadgetRarity } from "../game/types";
import { GADGET_RARITIES } from "./gadgetRarities";

export interface GadgetDefinition {
  id: GadgetProductId;
  name: string;
  description: string;
  projectCost: number;
  developmentWorkMs: number;
  previousProductId?: GadgetProductId;
}

const MINUTE = 60_000;

export const GADGET_PRODUCT_ORDER: readonly GadgetProductId[] = [
  "wristband",
  "mug",
  "underwear",
  "tshirt",
  "hoodie",
];

export const GADGET_DEFINITIONS: Record<GadgetProductId, GadgetDefinition> = {
  wristband: {
    id: "wristband",
    name: "Polsino",
    description: "Il primo prodotto ufficiale della scuola.",
    projectCost: 10_000,
    developmentWorkMs: 60 * MINUTE,
  },
  mug: {
    id: "mug",
    name: "Tazza",
    description: "Un gadget semplice, adatto a un pubblico più ampio.",
    projectCost: 15_000,
    developmentWorkMs: 90 * MINUTE,
    previousProductId: "wristband",
  },
  underwear: {
    id: "underwear",
    name: "Mutande",
    description: "Una scelta di catalogo decisamente riconoscibile.",
    projectCost: 20_000,
    developmentWorkMs: 120 * MINUTE,
    previousProductId: "mug",
  },
  tshirt: {
    id: "tshirt",
    name: "Maglietta",
    description: "Il prodotto centrale della linea della scuola.",
    projectCost: 25_000,
    developmentWorkMs: 150 * MINUTE,
    previousProductId: "underwear",
  },
  hoodie: {
    id: "hoodie",
    name: "Felpa",
    description: "Il progetto più impegnativo del catalogo base.",
    projectCost: 40_000,
    developmentWorkMs: 240 * MINUTE,
    previousProductId: "tshirt",
  },
};

export const GADGET_PROJECT_UNLOCK_SALES = 100;
export const GADGET_REVISION_COST_RATE = 0.1;
export const GADGET_REVISION_WORK_RATE = 1 / 3;
export const GADGET_BASE_ATTEMPTS_PER_MONTH_PER_PRODUCTIVITY = 5 / 5;
export const GADGET_MARGINAL_SALES_SPEED_MULTIPLIER = 1 / 10;

export const GADGET_MEMBER_REACH_LEVELS = [0.1, 0.2, 0.35, 0.5, 0.75, 1] as const;
export const GADGET_FOLLOWER_REACH_LEVELS = [
  0,
  0.01,
  0.03,
  0.05,
  0.1,
  0.2,
  0.35,
  0.5,
  0.75,
  1,
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
  noteCount: 24,
  travelMs: 2_400,
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

export function getNextGadgetProductId(
  productId: GadgetProductId,
): GadgetProductId | undefined {
  const index = GADGET_PRODUCT_ORDER.indexOf(productId);
  return index >= 0 ? GADGET_PRODUCT_ORDER[index + 1] : undefined;
}

export function getGadgetRevisionCost(
  productId: GadgetProductId,
  rarity: GadgetRarity = "common",
): number {
  return Math.round(
    GADGET_DEFINITIONS[productId].projectCost *
    GADGET_REVISION_COST_RATE *
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
