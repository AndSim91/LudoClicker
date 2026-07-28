import {
  GADGET_BASE_ATTEMPTS_PER_MONTH_PER_PRODUCTIVITY,
  GADGET_DEFINITIONS,
  GADGET_FOLLOWER_REACH_LEVELS,
  GADGET_MEMBER_REACH_LEVELS,
  GADGET_PRODUCT_ORDER,
  GADGET_QUALITY_CONVERSION_ANCHORS,
  getGadgetWorkRequirement,
} from "../content/gadgets";
import { getCollaboratorProductivity } from "../content/forms";
import { getUpgradeEffectTotal } from "../content/upgrades";
import type {
  GadgetProductId,
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
  );
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
  return getGadgetProductivity(state) * upgradeSpeed;
}

export function getGadgetWorkProgress(
  state: GameState,
): number | undefined {
  const work = state.gadgets.activeWork;
  if (!work) return undefined;
  const required = getGadgetWorkRequirement(work.productId, work.kind);
  return required <= 0
    ? 100
    : Math.min(100, Math.max(0, work.completedWorkMs / required * 100));
}

export function getGadgetWorkDurationMs(
  state: GameState,
  productId: GadgetProductId,
  kind: GadgetWorkKind,
): number {
  const speed = getGadgetWorkSpeed(state, kind);
  return speed > 0
    ? getGadgetWorkRequirement(productId, kind) / speed
    : Infinity;
}

export function getGadgetRemainingDemand(
  state: GameState,
  productId: GadgetProductId,
): number {
  return Math.max(
    0,
    getGadgetAudience(state) - state.gadgets.products[productId].unitsSold,
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
): number {
  return GADGET_DEFINITIONS[productId].projectCost / 500 *
    Math.max(0, Math.min(100, quality)) / 100;
}

export function getGadgetMonthlyAttemptCapacity(state: GameState): number {
  const capacityMultiplier = 1 + getUpgradeEffectTotal(
    state.upgrades,
    "gadgetSalesCapacity",
  );
  return getGadgetProductivity(state) *
    GADGET_BASE_ATTEMPTS_PER_MONTH_PER_PRODUCTIVITY *
    capacityMultiplier;
}

export function getGadgetCrossSellRate(upgrades: UpgradeLevels): number {
  return getUpgradeEffectTotal(upgrades, "gadgetCrossSell");
}

export function getSellableGadgetProductIds(
  state: GameState,
): GadgetProductId[] {
  return GADGET_PRODUCT_ORDER.filter((productId) => {
    const product = state.gadgets.products[productId];
    return product.accepted &&
      product.quality > 0 &&
      getGadgetRemainingDemand(state, productId) > 0;
  });
}

export function hasGadgetRuntimeWork(state: GameState): boolean {
  if (!state.unlocks.gadget || getGadgetProductivity(state) <= 0) return false;
  return Boolean(state.gadgets.activeWork) || getSellableGadgetProductIds(state).length > 0;
}
