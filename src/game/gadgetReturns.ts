import {
  GADGET_PRODUCT_ORDER,
  GADGET_PROJECT_UNLOCK_SALES,
  GADGET_RARITY_RETURN_SALES,
} from "../content/gadgets";
import { getGadgetFamilyUnitsSold } from "./gadgetRarity";
import type {
  GadgetProductId,
  GadgetProductState,
  GadgetRarity,
  GadgetReturn,
  GameState,
} from "./types";

/*
 * Gadget di carriera (Andrea, 15/10/2026). What a player put on sale in an earlier
 * school comes back with the sales, at its best quality, with no project and no
 * collaudo: the Portachiavi Comune from day one, then every 25 sales of a family its
 * Raro, Ultra Raro and Leggendario, and at 100 the next product. Never reached
 * before: the usual project and collaudo. Revisions stay open meanwhile.
 */

/** Raro at 25 sales, Ultra Raro at 50, Leggendario at 75 (the Segreto is not obtainable). */
const RETURNING_RARITIES: readonly GadgetRarity[] = ["rare", "ultra-rare", "legendary"];
const RETURN_RECORD_LIMIT = 20;

/** The quality a product×rarity comes back with, or undefined if never on sale. */
export function getSavedGadgetQuality(
  network: GameState["network"],
  productId: GadgetProductId,
  rarity: GadgetRarity,
): number | undefined {
  // Maestria predates `gadgetBest`: on old saves it is the only trace of past schools.
  if (network.gadgetMastery?.[productId]?.includes(rarity)) return 100;
  return network.gadgetBest?.[productId]?.[rarity];
}

/** Records the best quality of every rarity on sale; runs every step, allocates only on change. */
export function syncGadgetBest(state: GameState): GameState {
  let best = state.network.gadgetBest;
  for (const productId of GADGET_PRODUCT_ORDER) {
    const product = state.gadgets.products[productId];
    if (!product.accepted) continue;
    for (const [rarity, rarityState] of Object.entries(product.rarities) as [
      GadgetRarity,
      GadgetProductState["rarities"][GadgetRarity],
    ][]) {
      if (!rarityState.unlocked) continue;
      const saved = best?.[productId]?.[rarity];
      if (saved !== undefined && saved >= rarityState.quality) continue;
      best = { ...best, [productId]: { ...best?.[productId], [rarity]: rarityState.quality } };
    }
  }
  return best === state.network.gadgetBest
    ? state
    : { ...state, network: { ...state.network, gadgetBest: best } };
}

/** Puts back on sale what the sales have earned again. Called on every sale and at a new school. */
export function restoreCareerGadgets(state: GameState, now: number): GameState {
  const { network } = state;
  if (!state.unlocks.gadget || (!network.gadgetBest && !network.gadgetMastery)) return state;
  let products = state.gadgets.products;
  const returns: GadgetReturn[] = [];
  GADGET_PRODUCT_ORDER.forEach((productId, index) => {
    let product = products[productId];
    const previous = index > 0 ? products[GADGET_PRODUCT_ORDER[index - 1]] : undefined;
    const commonQuality = getSavedGadgetQuality(network, productId, "common");
    // Not when the player already bought the project: then it goes the usual way.
    if (
      commonQuality !== undefined &&
      !product.projectPurchased &&
      (!previous || getGadgetFamilyUnitsSold(previous) >= GADGET_PROJECT_UNLOCK_SALES)
    ) {
      product = {
        ...product,
        unlocked: true,
        projectPurchased: true,
        prototypeCompleted: true,
        accepted: true,
        rarities: {
          ...product.rarities,
          common: { ...product.rarities.common, unlocked: true, quality: commonQuality },
        },
      };
      returns.push({ productId, rarity: "common", at: now });
    }
    if (product.accepted) {
      const sold = getGadgetFamilyUnitsSold(product);
      RETURNING_RARITIES.forEach((rarity, step) => {
        const quality = getSavedGadgetQuality(network, productId, rarity);
        if (
          quality === undefined ||
          product.rarities[rarity].unlocked ||
          sold < (step + 1) * GADGET_RARITY_RETURN_SALES
        ) return;
        product = {
          ...product,
          rarities: {
            ...product.rarities,
            [rarity]: { ...product.rarities[rarity], unlocked: true, quality },
          },
        };
        returns.push({ productId, rarity, at: now });
      });
    }
    if (product !== products[productId]) products = { ...products, [productId]: product };
  });
  if (returns.length === 0) return state;
  return {
    ...state,
    gadgets: {
      ...state.gadgets,
      products,
      returns: [...(state.gadgets.returns ?? []), ...returns].slice(-RETURN_RECORD_LIMIT),
    },
  };
}
