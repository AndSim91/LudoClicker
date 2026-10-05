import { GADGET_PRODUCT_ORDER } from "../content/gadgets";
import { GADGET_RARITY_ORDER } from "../content/gadgetRarities";
import { createInitialGadgetRarities } from "./gadgetRarity";
import { createInitialGadgetMonthlyRevenueState } from "./gadgetRevenue";
import type {
  GadgetProductId,
  GadgetProductState,
  GadgetRarity,
  GadgetMinigameState,
  GadgetState,
  GadgetWorkState,
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

export function createInitialGadgetState(currentMonth = 9): GadgetState {
  return {
    products: Object.fromEntries(
      GADGET_PRODUCT_ORDER.map((productId) => [
        productId,
        createInitialGadgetProductState(),
      ]),
    ) as Record<GadgetProductId, GadgetProductState>,
    activeWorks: [],
    crossSellRemainder: 0,
    crossSellCursor: 0,
    monthlyRevenue: createInitialGadgetMonthlyRevenueState(currentMonth),
  };
}

function isValidGadgetWork(work: GadgetWorkState): boolean {
  return isProductId(work.productId) &&
    (work.kind === "development" || work.kind === "revision") &&
    isGadgetRarity(work.rarity) &&
    (work.opportunityRarity === undefined || isGadgetRarity(work.opportunityRarity)) &&
    isFiniteNonNegative(work.completedWorkMs);
}

function isValidGadgetMinigame(minigame: GadgetMinigameState): boolean {
  return isProductId(minigame.productId) &&
    (minigame.kind === "development" || minigame.kind === "revision") &&
    isGadgetRarity(minigame.rarity) &&
    (minigame.opportunityRarity === undefined || isGadgetRarity(minigame.opportunityRarity)) &&
    (minigame.unlockedRarity === undefined ||
      (isGadgetRarity(minigame.unlockedRarity) && minigame.status === "result")) &&
    Number.isSafeInteger(minigame.seed) &&
    Number.isSafeInteger(minigame.previousQuality) &&
    minigame.previousQuality >= 0 && minigame.previousQuality <= 100 &&
    ["ready", "running", "result"].includes(minigame.status) &&
    (minigame.status === "result"
      ? Number.isSafeInteger(minigame.score) &&
        (minigame.score ?? -1) >= 0 &&
        (minigame.score ?? 101) <= 100
      : minigame.score === undefined);
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
        !Number.isSafeInteger(rarityState.extraUnitsSold) ||
        rarityState.extraUnitsSold < 0 ||
        rarityState.extraUnitsSold > rarityState.unitsSold ||
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
  if (
    !state.monthlyRevenue ||
    !Number.isSafeInteger(state.monthlyRevenue.month) ||
    state.monthlyRevenue.month < 1 ||
    !state.monthlyRevenue.totals
  ) return false;
  for (const productId of GADGET_PRODUCT_ORDER) {
    const total = state.monthlyRevenue.totals[productId];
    if (!isFiniteNonNegative(total)) return false;
  }
  if (!Array.isArray(state.activeWorks) || !state.activeWorks.every(isValidGadgetWork)) return false;
  if (state.minigame && !isValidGadgetMinigame(state.minigame)) return false;
  if (state.minigameQueue !== undefined && (
    !Array.isArray(state.minigameQueue) ||
    !state.minigameQueue.every((queued) => isValidGadgetMinigame(queued) && queued.status === "ready")
  )) return false;
  return true;
}

export function isValidGadgetMastery(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([productId, rarities]) =>
    isProductId(productId) && Array.isArray(rarities) && rarities.every(isGadgetRarity),
  );
}
