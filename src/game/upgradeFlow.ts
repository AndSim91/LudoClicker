import {
  UPGRADE_DEFINITIONS,
  getUpgradeCost,
  getUpgradeDefinition,
  hasCompletedUpgradePrerequisites,
  type UpgradeDefinition,
} from "../content/upgrades";
import { getWritingPower } from "./formulas";
import type { GameState, SecretUpgradeId, UpgradeId } from "./types";

export function discoverSecretUpgrade(
  state: GameState,
  upgradeId: SecretUpgradeId,
): GameState {
  if (state.secretUpgradeDiscoveries.includes(upgradeId)) return state;
  return {
    ...state,
    secretUpgradeDiscoveries: [...state.secretUpgradeDiscoveries, upgradeId],
  };
}

/** Every rule of a purchase except the price: hidden, maxed, locked or undiscovered. */
function canBuyIgnoringFunds(
  state: GameState,
  definition: UpgradeDefinition,
): boolean {
  return !(
    definition.hidden ||
    state.upgrades[definition.id] >= definition.maxLevel ||
    definition.requiredUnlocks?.some((unlock) => !state.unlocks[unlock]) ||
    (definition.requiredNetworkSchools !== undefined &&
      state.network.schoolCount < definition.requiredNetworkSchools) ||
    (definition.secretHint !== undefined &&
      !state.secretUpgradeDiscoveries.includes(definition.id as SecretUpgradeId)) ||
    (definition.requiredGadgetProduct !== undefined &&
      !state.gadgets.products[definition.requiredGadgetProduct].unlocked) ||
    state.school.fame < definition.requiredFame ||
    !hasCompletedUpgradePrerequisites(state.upgrades, definition)
  );
}

export function buyUpgrade(state: GameState, upgradeId: UpgradeId): GameState {
  const definition = getUpgradeDefinition(upgradeId);
  if (!definition || !canBuyIgnoringFunds(state, definition)) return state;
  const currentLevel = state.upgrades[upgradeId];
  const cost = getUpgradeCost(definition, currentLevel, state.upgrades);
  if (state.school.euros < cost) return state;

  const upgrades = { ...state.upgrades, [upgradeId]: currentLevel + 1 };
  const nextState: GameState = {
    ...state,
    school: { ...state.school, euros: state.school.euros - cost },
    upgrades,
  };
  return {
    ...nextState,
    player: { ...nextState.player, writingPower: getWritingPower(nextState) },
  };
}

export interface BuyAllPlan {
  /** Purchases in order, as «Compra tutto» makes them. */
  purchases: UpgradeId[];
  /** Euros spent. */
  total: number;
  /** The same purchases happen for any balance in [minEuros, maxEuros). */
  minEuros: number;
  maxEuros: number;
}

const BUY_ALL_DEFINITIONS = UPGRADE_DEFINITIONS.filter(
  (definition) => definition.category !== "secrets",
);

/** The cheapest node the rules allow, with its price at these levels. */
function findCheapestPurchase(state: GameState): { id: UpgradeId; cost: number } | undefined {
  let cheapest: { id: UpgradeId; cost: number } | undefined;
  for (const definition of BUY_ALL_DEFINITIONS) {
    const cost = getUpgradeCost(definition, state.upgrades[definition.id], state.upgrades);
    // Strictly cheaper: on a tie the earlier node in the catalogue wins, as before.
    if (cheapest && cost >= cheapest.cost) continue;
    if (canBuyIgnoringFunds(state, definition)) cheapest = { id: definition.id, cost };
  }
  return cheapest;
}

/**
 * "Compra tutto": buys the cheapest purchasable upgrade again and again until the
 * funds run out, so the funds go to as many levels as possible. A bought level can
 * open the next node, which then joins the race. Secret paths stay a deliberate choice.
 * Only levels and funds change between purchases, so the plan runs on those alone.
 */
export function planBuyAllUpgrades(state: GameState): BuyAllPlan {
  let levels = state.upgrades;
  let euros = state.school.euros;
  const purchases: UpgradeId[] = [];
  for (;;) {
    const view: GameState = levels === state.upgrades ? state : { ...state, upgrades: levels };
    const next = findCheapestPurchase(view);
    if (!next || next.cost > euros) {
      const total = state.school.euros - euros;
      return {
        purchases,
        total,
        minEuros: total,
        maxEuros: total + (next?.cost ?? Infinity),
      };
    }
    purchases.push(next.id);
    euros -= next.cost;
    levels = { ...levels, [next.id]: levels[next.id] + 1 };
  }
}

export function buyAllAffordableUpgrades(state: GameState): GameState {
  let current = state;
  for (const upgradeId of planBuyAllUpgrades(state).purchases) {
    current = buyUpgrade(current, upgradeId);
  }
  return current;
}

interface CachedBuyAllPlan {
  plan: BuyAllPlan;
  unlocks: GameState["unlocks"];
  schoolCount: number;
  secretUpgradeDiscoveries: GameState["secretUpgradeDiscoveries"];
  gadgetProducts: string;
  fameTier: number;
}

const buyAllPlanCache = new WeakMap<GameState["upgrades"], CachedBuyAllPlan>();

/** Fame only matters against the nodes' thresholds: count the thresholds reached. */
function getFameTier(fame: number): number {
  let tier = 0;
  for (const definition of BUY_ALL_DEFINITIONS) if (definition.requiredFame <= fame) tier += 1;
  return tier;
}

function getUnlockedGadgetProducts(state: GameState): string {
  return Object.entries(state.gadgets.products)
    .flatMap(([id, product]) => product.unlocked ? [id] : [])
    .join(",");
}

/**
 * The «Compra tutto» preview the Upgrade page shows on every tick. The funds change
 * every tick, the plan only when they cross its range or a rule input changes.
 * Keyed on the levels object, which is never modified in place.
 */
export function getBuyAllPreview(state: GameState): { count: number; total: number } {
  const euros = state.school.euros;
  const gadgetProducts = getUnlockedGadgetProducts(state);
  const cached = buyAllPlanCache.get(state.upgrades);
  if (
    cached &&
    euros >= cached.plan.minEuros &&
    euros < cached.plan.maxEuros &&
    cached.unlocks === state.unlocks &&
    cached.schoolCount === state.network.schoolCount &&
    cached.secretUpgradeDiscoveries === state.secretUpgradeDiscoveries &&
    cached.gadgetProducts === gadgetProducts &&
    cached.fameTier === getFameTier(state.school.fame)
  ) {
    return { count: cached.plan.purchases.length, total: cached.plan.total };
  }
  const plan = planBuyAllUpgrades(state);
  buyAllPlanCache.set(state.upgrades, {
    plan,
    unlocks: state.unlocks,
    schoolCount: state.network.schoolCount,
    secretUpgradeDiscoveries: state.secretUpgradeDiscoveries,
    gadgetProducts,
    fameTier: getFameTier(state.school.fame),
  });
  return { count: plan.purchases.length, total: plan.total };
}
