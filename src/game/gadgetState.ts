import { GADGET_PRODUCT_ORDER } from "../content/gadgets";
import type {
  GadgetProductId,
  GadgetProductState,
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
    quality: 0,
    unitsSold: 0,
    totalProfit: 0,
    salesRemainder: 0,
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
      !Number.isSafeInteger(product.quality) ||
      product.quality < 0 || product.quality > 100 ||
      !Number.isSafeInteger(product.unitsSold) || product.unitsSold < 0 ||
      !isFiniteNonNegative(product.totalProfit) ||
      !isFiniteNonNegative(product.salesRemainder) || product.salesRemainder >= 1
    ) return false;
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
    !isFiniteNonNegative(state.activeWork.completedWorkMs)
  )) return false;
  if (state.minigame && (
    !isProductId(state.minigame.productId) ||
    (state.minigame.kind !== "development" && state.minigame.kind !== "revision") ||
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
