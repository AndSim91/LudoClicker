import type { GadgetRarity } from "../game/types";

export interface GadgetRarityDefinition {
  id: GadgetRarity;
  label: string;
  valueMultiplier: number;
  revisionMultiplier: number;
}

export const GADGET_RARITY_ORDER: readonly GadgetRarity[] = [
  "common",
  "rare",
  "ultra-rare",
  "legendary",
  "secret-legendary",
];

export const GADGET_RARITIES: Record<GadgetRarity, GadgetRarityDefinition> = {
  common: {
    id: "common",
    label: "Comune",
    valueMultiplier: 1,
    revisionMultiplier: 1,
  },
  rare: {
    id: "rare",
    label: "Raro",
    valueMultiplier: 1.5,
    revisionMultiplier: 1.25,
  },
  "ultra-rare": {
    id: "ultra-rare",
    label: "Ultra Raro",
    valueMultiplier: 2,
    revisionMultiplier: 1.5,
  },
  legendary: {
    id: "legendary",
    label: "Leggendario",
    valueMultiplier: 2.5,
    revisionMultiplier: 1.75,
  },
  "secret-legendary": {
    id: "secret-legendary",
    label: "Leggendario Segreto",
    valueMultiplier: 3,
    revisionMultiplier: 2,
  },
};

export const GADGET_RARITY_UNLOCK_SCORE_THRESHOLD = 50;
export const GADGET_RARITY_SALES_CHANCE_PER_TEN = 0.01;
export const GADGET_RARITY_QUALITY_CHANCE_PER_TEN = 0.025;

export function getNextGadgetRarity(
  rarity: GadgetRarity,
): GadgetRarity | undefined {
  const index = GADGET_RARITY_ORDER.indexOf(rarity);
  return index >= 0 ? GADGET_RARITY_ORDER[index + 1] : undefined;
}

export function getGadgetRarityClassName(rarity: GadgetRarity): string {
  return `rarity-${rarity}`;
}
