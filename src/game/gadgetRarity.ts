import {
  GADGET_RARITY_ORDER,
  GADGET_RARITY_QUALITY_CHANCE_PER_TEN,
  GADGET_RARITY_SALES_CHANCE_PER_TEN,
  getNextGadgetRarity,
} from "../content/gadgetRarities";
import type {
  GadgetProductId,
  GadgetProductState,
  GadgetRarity,
  GadgetRarityState,
  GameState,
} from "./types";

export function createInitialGadgetRarityState(): GadgetRarityState {
  return {
    unlocked: false,
    quality: 0,
    unitsSold: 0,
    totalProfit: 0,
    salesRemainder: 0,
  };
}

export function createInitialGadgetRarities(): Record<
  GadgetRarity,
  GadgetRarityState
> {
  return Object.fromEntries(
    GADGET_RARITY_ORDER.map((rarity) => [
      rarity,
      createInitialGadgetRarityState(),
    ]),
  ) as Record<GadgetRarity, GadgetRarityState>;
}

export function getUnlockedGadgetRarities(
  product: GadgetProductState,
): GadgetRarity[] {
  return GADGET_RARITY_ORDER.filter((rarity) => product.rarities[rarity].unlocked);
}

export function getHighestUnlockedGadgetRarity(
  product: GadgetProductState,
): GadgetRarity {
  return getUnlockedGadgetRarities(product).at(-1) ?? "common";
}

export function getGadgetFamilyUnitsSold(product: GadgetProductState): number {
  return GADGET_RARITY_ORDER.reduce(
    (total, rarity) => total + product.rarities[rarity].unitsSold,
    0,
  );
}

export function getGadgetFamilyProfit(product: GadgetProductState): number {
  return GADGET_RARITY_ORDER.reduce(
    (total, rarity) => total + product.rarities[rarity].totalProfit,
    0,
  );
}

export function getGadgetRarityUpgradeChance(
  product: GadgetProductState,
  rarity: GadgetRarity,
): number {
  const current = product.rarities[rarity];
  if (!current.unlocked) return 0;
  const salesChance = Math.floor(current.unitsSold / 10) *
    GADGET_RARITY_SALES_CHANCE_PER_TEN;
  const qualityChance = Math.floor(current.quality / 10) *
    GADGET_RARITY_QUALITY_CHANCE_PER_TEN;
  return Math.min(1, Math.max(0, salesChance + qualityChance));
}

export function areSecretLegendaryGadgetRequirementsMet(
  state: GameState,
  productId: GadgetProductId,
): boolean {
  void state;
  void productId;
  // TBD di design: ogni prodotto avra requisiti specifici. Finche non saranno
  // definiti, il Leggendario Segreto resta intenzionalmente non ottenibile.
  return false;
}

export function canRollNextGadgetRarity(
  state: GameState,
  productId: GadgetProductId,
  rarity: GadgetRarity,
): boolean {
  const nextRarity = getNextGadgetRarity(rarity);
  if (!nextRarity) return false;
  if (state.gadgets.products[productId].rarities[nextRarity].unlocked) return false;
  return nextRarity !== "secret-legendary" ||
    areSecretLegendaryGadgetRequirementsMet(state, productId);
}
