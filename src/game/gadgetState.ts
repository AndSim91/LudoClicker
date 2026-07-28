import { GADGET_PRODUCT_ORDER } from "../content/gadgets";
import { GADGET_RARITY_ORDER } from "../content/gadgetRarities";
import { createInitialGadgetRarities } from "./gadgetRarity";
import type {
  GadgetProductId,
  GadgetProductState,
  GadgetRarity,
  GadgetState,
} from "./types";

export function createInitialGadgetProductState(
  unlocked = false,
): GadgetProductState {
  return {
    unlocked,
    projectPurchased: false,
    prototypeCompleted: false,
    accepted: false,
    rarities: createInitialGadgetRarities(),
  };
}

export function createInitialGadgetState(): GadgetState {
  return {
    products: Object.fromEntries(
      GADGET_PRODUCT_ORDER.map((productId) => [
        productId,
        createInitialGadgetProductState(),
      ]),
    ) as Record<GadgetProductId, GadgetProductState>,
    crossSellRemainder: 0,
    crossSellCursor: 0,
  };
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isProductId(value: unknown): value is GadgetProductId {
  return GADGET_PRODUCT_ORDER.includes(value as GadgetProductId);
}

function isGadgetRarity(value: unknown): value is GadgetRarity {
  return GADGET_RARITY_ORDER.includes(value as GadgetRarity);
}

export function isValidGadgetState(value: unknown): value is GadgetState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GadgetState>;
  if (!state.products || typeof state.products !== "object") return false;
  for (const productId of GADGET_PRODUCT_ORDER) {
    const product = state.products[productId];
    if (
      !product ||
      typeof product.unlocked !== "boolean" ||
      typeof product.projectPurchased !== "boolean" ||
      typeof product.prototypeCompleted !== "boolean" ||
      typeof product.accepted !== "boolean" ||
      !product.rarities ||
      typeof product.rarities !== "object"
    ) return false;
    for (const rarity of GADGET_RARITY_ORDER) {
      const rarityState = product.rarities[rarity];
      if (
        !rarityState ||
        typeof rarityState.unlocked !== "boolean" ||
        !Number.isSafeInteger(rarityState.quality) ||
        rarityState.quality < 0 || rarityState.quality > 100 ||
        !Number.isSafeInteger(rarityState.unitsSold) || rarityState.unitsSold < 0 ||
        !isFiniteNonNegative(rarityState.totalProfit) ||
        !isFiniteNonNegative(rarityState.salesRemainder) ||
        rarityState.salesRemainder >= 1
      ) return false;
    }
  }
  if (
    !isFiniteNonNegative(state.crossSellRemainder) ||
    state.crossSellRemainder >= 1 ||
    !Number.isSafeInteger(state.crossSellCursor) ||
    (state.crossSellCursor ?? -1) < 0
  ) return false;
  if (state.activeWork && (
    !isProductId(state.activeWork.productId) ||
    (state.activeWork.kind !== "development" && state.activeWork.kind !== "revision") ||
    !isGadgetRarity(state.activeWork.rarity) ||
    (state.activeWork.opportunityRarity !== undefined &&
      !isGadgetRarity(state.activeWork.opportunityRarity)) ||
    !isFiniteNonNegative(state.activeWork.completedWorkMs)
  )) return false;
  if (state.minigame && (
    !isProductId(state.minigame.productId) ||
    (state.minigame.kind !== "development" && state.minigame.kind !== "revision") ||
    !isGadgetRarity(state.minigame.rarity) ||
    (state.minigame.opportunityRarity !== undefined &&
      !isGadgetRarity(state.minigame.opportunityRarity)) ||
    (state.minigame.unlockedRarity !== undefined &&
      (!isGadgetRarity(state.minigame.unlockedRarity) ||
        state.minigame.status !== "result")) ||
    !Number.isSafeInteger(state.minigame.seed) ||
    !Number.isSafeInteger(state.minigame.previousQuality) ||
    state.minigame.previousQuality < 0 || state.minigame.previousQuality > 100 ||
    !["ready", "running", "result"].includes(state.minigame.status) ||
    (state.minigame.status === "result"
      ? !Number.isSafeInteger(state.minigame.score) ||
        (state.minigame.score ?? -1) < 0 ||
        (state.minigame.score ?? 101) > 100
      : state.minigame.score !== undefined)
  )) return false;
  return true;
}
