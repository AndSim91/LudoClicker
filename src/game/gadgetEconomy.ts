import {
  GADGET_BASE_ATTEMPTS_PER_MONTH_PER_PRODUCTIVITY,
  GADGET_DEFINITIONS,
  GADGET_FOLLOWER_REACH_LEVELS,
  GADGET_EXTRA_SALES_SPEED_MULTIPLIER,
  GADGET_MEMBER_REACH_LEVELS,
  GADGET_PRODUCT_ORDER,
  GADGET_QUALITY_CONVERSION_ANCHORS,
  getGadgetWorkRequirement,
} from "../content/gadgets";
import { GADGET_RARITIES, GADGET_RARITY_ORDER } from "../content/gadgetRarities";
import { getCollaboratorProductivity } from "../content/forms";
import { getUpgradeEffectTotal } from "../content/upgrades";
import { getCollaboratorFallbackProductivity } from "./collaboratorFallback";
import { getGadgetAudienceUnitsSold } from "./gadgetRarity";
import type {
  GadgetProductId,
  GadgetRarity,
  GadgetWorkKind,
  GameState,
  UpgradeLevels,
} from "./types";

function boundedLevel(level: number | undefined, maximumIndex: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(maximumIndex, Math.floor(level ?? 0)));
}

export function getGadgetMemberReach(upgrades: UpgradeLevels): number {
  const level = boundedLevel(
    upgrades["gadget-showcase"],
    GADGET_MEMBER_REACH_LEVELS.length - 1,
  );
  return GADGET_MEMBER_REACH_LEVELS[level];
}

export function getGadgetFollowerReach(upgrades: UpgradeLevels): number {
  const level = boundedLevel(
    upgrades["gadget-online-store"],
    GADGET_FOLLOWER_REACH_LEVELS.length - 1,
  );
  return GADGET_FOLLOWER_REACH_LEVELS[level];
}

export function getGadgetAudience(state: GameState): number {
  const rawAudience =
    state.school.activeMembers * getGadgetMemberReach(state.upgrades) +
    state.school.followers * getGadgetFollowerReach(state.upgrades);
  return Number.isFinite(rawAudience)
    ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(rawAudience)))
    : Number.MAX_SAFE_INTEGER;
}

export function getGadgetProductivity(state: GameState): number {
  return state.collaborators.reduce(
    (total, collaborator) => collaborator.assignment === "gadget"
      ? total + getCollaboratorProductivity(collaborator, "gadget")
      : total,
    0,
  ) + getCollaboratorFallbackProductivity(state, "gadget");
}

export function getGadgetDevelopmentSpeed(upgrades: UpgradeLevels): number {
  return 1 + getUpgradeEffectTotal(upgrades, "gadgetDevelopmentSpeed");
}

export function getGadgetRevisionSpeed(upgrades: UpgradeLevels): number {
  return 1 + getUpgradeEffectTotal(upgrades, "gadgetRevisionSpeed");
}

export function getGadgetWorkSpeed(
  state: GameState,
  kind: GadgetWorkKind,
): number {
  const upgradeSpeed = kind === "development"
    ? getGadgetDevelopmentSpeed(state.upgrades)
    : getGadgetRevisionSpeed(state.upgrades);
  const genericAutomationBonus = getUpgradeEffectTotal(
    state.upgrades,
    "automationMultiplier",
  );
  return getGadgetProductivity(state) * (upgradeSpeed + genericAutomationBonus);
}

export function getGadgetWorkProgress(
  state: GameState,
): number | undefined {
  const work = state.gadgets.activeWork;
  if (!work) return undefined;
  const required = getGadgetWorkRequirement(work.productId, work.kind, work.rarity);
  return required <= 0
    ? 100
    : Math.min(100, Math.max(0, work.completedWorkMs / required * 100));
}

export function getGadgetWorkDurationMs(
  state: GameState,
  productId: GadgetProductId,
  kind: GadgetWorkKind,
  rarity: GadgetRarity = "common",
): number {
  const speed = getGadgetWorkSpeed(state, kind);
  return speed > 0
    ? getGadgetWorkRequirement(productId, kind, rarity) / speed
    : Infinity;
}

export function getGadgetRemainingDemand(
  state: GameState,
  productId: GadgetProductId,
  rarity: GadgetRarity,
): number {
  return Math.max(
    0,
    getGadgetAudience(state) -
      getGadgetAudienceUnitsSold(
        state.gadgets.products[productId].rarities[rarity],
      ),
  );
}

export function getGadgetBaseQualityConversion(quality: number): number {
  const boundedQuality = Math.max(0, Math.min(100, quality));
  for (let index = 1; index < GADGET_QUALITY_CONVERSION_ANCHORS.length; index += 1) {
    const lower = GADGET_QUALITY_CONVERSION_ANCHORS[index - 1];
    const upper = GADGET_QUALITY_CONVERSION_ANCHORS[index];
    if (boundedQuality > upper.quality) continue;
    const progress = (boundedQuality - lower.quality) / (upper.quality - lower.quality);
    return lower.conversion + (upper.conversion - lower.conversion) * progress;
  }
  return 1;
}

export function getGadgetQualityConversion(
  quality: number,
  upgrades: UpgradeLevels,
): number {
  if (quality <= 0) return 0;
  const commercialBonus = getUpgradeEffectTotal(upgrades, "gadgetSalesConversion");
  return Math.min(1, getGadgetBaseQualityConversion(quality) + commercialBonus);
}

export function getGadgetUnitProfit(
  productId: GadgetProductId,
  quality: number,
  rarity: GadgetRarity = "common",
): number {
  return GADGET_DEFINITIONS[productId].unitProfitAtMaxQuality *
    Math.max(0, Math.min(100, quality)) / 100 *
    GADGET_RARITIES[rarity].valueMultiplier;
}

export function getGadgetMonthlyAttemptCapacity(state: GameState): number {
  const capacityMultiplier = 1 +
    getUpgradeEffectTotal(state.upgrades, "gadgetSalesCapacity") +
    getUpgradeEffectTotal(state.upgrades, "automationMultiplier");
  return getGadgetProductivity(state) *
    GADGET_BASE_ATTEMPTS_PER_MONTH_PER_PRODUCTIVITY *
    capacityMultiplier;
}

export function getGadgetExtraMonthlyAttemptCapacity(
  state: GameState,
): number {
  return getGadgetMonthlyAttemptCapacity(state) *
    GADGET_EXTRA_SALES_SPEED_MULTIPLIER;
}

export function getGadgetCrossSellRate(upgrades: UpgradeLevels): number {
  return getUpgradeEffectTotal(upgrades, "gadgetCrossSell");
}

export interface SellableGadgetVariant {
  productId: GadgetProductId;
  rarity: GadgetRarity;
}

export function getSellableGadgetVariants(
  state: GameState,
): SellableGadgetVariant[] {
  return GADGET_PRODUCT_ORDER.flatMap((productId) => {
    const product = state.gadgets.products[productId];
    if (!product.accepted) return [];
    return GADGET_RARITY_ORDER.flatMap((rarity) => {
      const rarityState = product.rarities[rarity];
      return rarityState.unlocked &&
        rarityState.quality > 0 &&
        rarityState.unitsSold < Number.MAX_SAFE_INTEGER
        ? [{ productId, rarity }]
        : [];
    });
  });
}

export function hasGadgetRuntimeWork(state: GameState): boolean {
  if (!state.unlocks.gadget || getGadgetProductivity(state) <= 0) return false;
  return Boolean(state.gadgets.activeWork) || getSellableGadgetVariants(state).length > 0;
}
