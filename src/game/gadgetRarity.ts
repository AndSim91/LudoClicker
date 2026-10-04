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
    extraUnitsSold: 0,
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

export function getGadgetAudienceUnitsSold(
  rarityState: GadgetRarityState,
): number {
  return Math.max(0, rarityState.unitsSold - rarityState.extraUnitsSold);
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

/** Maestria: a product×rarity that once reached 100% skips its collaudo forever, in every school. */
export function isGadgetRarityMastered(
  state: GameState,
  productId: GadgetProductId,
  rarity: GadgetRarity,
): boolean {
  return state.network.gadgetMastery?.[productId]?.includes(rarity) === true;
}

/** Records every product×rarity at 100% (also the 100% given when the next rarity unlocks). */
export function syncGadgetMastery(state: GameState): GameState {
  let mastery = state.network.gadgetMastery;
  for (const [productId, product] of Object.entries(state.gadgets.products) as [
    GadgetProductId,
    GadgetProductState,
  ][]) {
    for (const rarity of GADGET_RARITY_ORDER) {
      const rarityState = product.rarities[rarity];
      if (!rarityState.unlocked || rarityState.quality < 100) continue;
      if (mastery?.[productId]?.includes(rarity)) continue;
      const known = mastery?.[productId] ?? [];
      mastery = {
        ...mastery,
        [productId]: GADGET_RARITY_ORDER.filter((id) => id === rarity || known.includes(id)),
      };
    }
  }
  return mastery === state.network.gadgetMastery
    ? state
    : { ...state, network: { ...state.network, gadgetMastery: mastery } };
}
