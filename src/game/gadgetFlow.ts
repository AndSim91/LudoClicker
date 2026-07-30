import {
  GADGET_DEFINITIONS,
  GADGET_PRODUCT_ORDER,
  GADGET_PROJECT_UNLOCK_SALES,
  getGadgetRevisionCost,
  getGadgetWorkRequirement,
  getNextGadgetProductId,
} from "../content/gadgets";
import {
  GADGET_RARITY_ORDER,
  GADGET_RARITY_UNLOCK_SCORE_THRESHOLD,
  getNextGadgetRarity,
} from "../content/gadgetRarities";
import {
  getGadgetAudience,
  getGadgetCrossSellRate,
  getGadgetExtraMonthlyAttemptCapacity,
  getGadgetMonthlyAttemptCapacity,
  getGadgetQualityConversion,
  getGadgetUnitProfit,
  getGadgetWorkSpeed,
  getSellableGadgetVariants,
  type SellableGadgetVariant,
} from "./gadgetEconomy";
import {
  canRollNextGadgetRarity,
  getGadgetAudienceUnitsSold,
  getGadgetFamilyUnitsSold,
  getGadgetRarityUpgradeChance,
  getHighestUnlockedGadgetRarity,
} from "./gadgetRarity";
import { recordGadgetMonthlyRevenue } from "./gadgetRevenue";
import { roundCurrency } from "./economy";
import { GAME_CONFIG } from "./config";
import { nextRandom } from "./random";
import { addMessage } from "./stateUpdates";
import type {
  GadgetProductId,
  GadgetRarity,
  GameState,
  TournamentResult,
} from "./types";

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(score) ? score : 0)));
}

export function didOwnedAthleteWinAcademyArena(
  result: TournamentResult,
): boolean {
  if (result.level !== "academy") return false;
  const arenaWinner = result.participants.find(
    (participant) => participant.id === result.arenaRanking[0],
  );
  return Boolean(arenaWinner?.ownedContactId);
}

export function unlockGadgetSector(state: GameState, now: number): GameState {
  if (state.unlocks.gadget) return state;
  const unlockedState: GameState = {
    ...state,
    unlocks: { ...state.unlocks, gadget: true },
    gadgets: {
      ...state.gadgets,
      products: {
        ...state.gadgets.products,
        wristband: {
          ...state.gadgets.products.wristband,
          unlocked: true,
        },
      },
    },
  };
  return addMessage(
    unlockedState,
    now,
    "Laboratorio Gadget sbloccato",
    "La vittoria nel Torneo Accademico ha aperto il settore Gadget. Acquista il progetto del Polsino e assegna Collaboratori al nuovo incarico per svilupparlo.",
    "positive",
    "focused",
    "gadget",
  );
}

export function unlockGadgetSectorFromTournamentResult(
  state: GameState,
  result: TournamentResult,
  now: number,
): GameState {
  return didOwnedAthleteWinAcademyArena(result)
    ? unlockGadgetSector(state, now)
    : state;
}

export function startGadgetProject(
  state: GameState,
  productId: GadgetProductId,
): GameState {
  const definition = GADGET_DEFINITIONS[productId];
  const product = state.gadgets.products[productId];
  if (
    !state.unlocks.gadget ||
    !product?.unlocked ||
    product.projectPurchased ||
    state.gadgets.activeWork ||
    state.gadgets.minigame ||
    state.school.euros < definition.projectCost
  ) return state;

  return {
    ...state,
    school: {
      ...state.school,
      euros: roundCurrency(state.school.euros - definition.projectCost),
    },
    gadgets: {
      ...state.gadgets,
      products: {
        ...state.gadgets.products,
        [productId]: { ...product, projectPurchased: true },
      },
      activeWork: {
        productId,
        kind: "development",
        rarity: "common",
        completedWorkMs: 0,
      },
    },
  };
}

export function startGadgetRevision(
  state: GameState,
  productId: GadgetProductId,
): GameState {
  const product = state.gadgets.products[productId];
  const resultForProduct = state.gadgets.minigame?.status === "result" &&
    state.gadgets.minigame.productId === productId;
  const rarity = product ? getHighestUnlockedGadgetRarity(product) : "common";
  const rarityState = product?.rarities[rarity];
  const nextRarity = getNextGadgetRarity(rarity);
  const canRollNext = product
    ? canRollNextGadgetRarity(state, productId, rarity)
    : false;
  const canImprove = Boolean(
    rarityState && (rarityState.quality < 100 || canRollNext),
  );
  const cost = getGadgetRevisionCost(productId, rarity);
  if (
    !state.unlocks.gadget ||
    !product?.unlocked ||
    !product.projectPurchased ||
    !product.prototypeCompleted ||
    !canImprove ||
    state.gadgets.activeWork ||
    (state.gadgets.minigame !== undefined && !resultForProduct) ||
    state.school.euros < cost
  ) return state;

  let randomSeed = state.randomSeed;
  let opportunityRarity: GadgetRarity | undefined;
  if (canRollNext && nextRarity) {
    const [roll, nextSeed] = nextRandom(randomSeed);
    randomSeed = nextSeed;
    if (roll < getGadgetRarityUpgradeChance(product, rarity)) {
      opportunityRarity = nextRarity;
    }
  }

  return {
    ...state,
    randomSeed,
    school: {
      ...state.school,
      euros: roundCurrency(state.school.euros - cost),
    },
    gadgets: {
      ...state.gadgets,
      minigame: undefined,
      activeWork: {
        productId,
        kind: "revision",
        rarity,
        opportunityRarity,
        completedWorkMs: 0,
      },
    },
  };
}

export function startGadgetMinigame(
  state: GameState,
  productId: GadgetProductId,
): GameState {
  const minigame = state.gadgets.minigame;
  if (
    !minigame ||
    minigame.productId !== productId ||
    minigame.status !== "ready"
  ) return state;
  return {
    ...state,
    gadgets: {
      ...state.gadgets,
      minigame: { ...minigame, status: "running" },
    },
  };
}

export function completeGadgetMinigame(
  state: GameState,
  productId: GadgetProductId,
  rawScore: number,
): GameState {
  const minigame = state.gadgets.minigame;
  if (
    !minigame ||
    minigame.productId !== productId ||
    minigame.status !== "running"
  ) return state;
  const score = clampScore(rawScore);
  const product = state.gadgets.products[productId];
  const rarity = minigame.rarity;
  const currentRarity = product.rarities[rarity];
  const unlockedRarity = minigame.kind === "revision" &&
    minigame.opportunityRarity !== undefined &&
    minigame.opportunityRarity === getNextGadgetRarity(rarity) &&
    !product.rarities[minigame.opportunityRarity].unlocked &&
    score > GADGET_RARITY_UNLOCK_SCORE_THRESHOLD
    ? minigame.opportunityRarity
    : undefined;
  const rarities = unlockedRarity
    ? {
        ...product.rarities,
        [rarity]: { ...currentRarity, quality: 100 },
        [unlockedRarity]: {
          ...product.rarities[unlockedRarity],
          unlocked: true,
          quality: score,
        },
      }
    : {
        ...product.rarities,
        [rarity]: {
          ...currentRarity,
          unlocked: true,
          quality: Math.max(currentRarity.quality, score),
        },
      };
  return {
    ...state,
    gadgets: {
      ...state.gadgets,
      products: {
        ...state.gadgets.products,
        [productId]: {
          ...product,
          prototypeCompleted: true,
          rarities,
        },
      },
      minigame: {
        ...minigame,
        status: "result",
        score,
        unlockedRarity,
      },
    },
  };
}

export function dismissGadgetMinigameResult(
  state: GameState,
  productId: GadgetProductId,
): GameState {
  const minigame = state.gadgets.minigame;
  if (
    !minigame ||
    minigame.productId !== productId ||
    minigame.status !== "result"
  ) return state;
  return {
    ...state,
    gadgets: { ...state.gadgets, minigame: undefined },
  };
}

export function acceptGadgetProduct(
  state: GameState,
  productId: GadgetProductId,
): GameState {
  const product = state.gadgets.products[productId];
  const minigame = state.gadgets.minigame;
  if (
    !state.unlocks.gadget ||
    !product?.unlocked ||
    !product?.projectPurchased ||
    !product.prototypeCompleted ||
    product.accepted ||
    state.gadgets.activeWork?.productId === productId ||
    (minigame !== undefined &&
      (minigame.productId !== productId || minigame.status !== "result"))
  ) return state;
  return {
    ...state,
    gadgets: {
      ...state.gadgets,
      minigame: minigame?.productId === productId ? undefined : minigame,
      products: {
        ...state.gadgets.products,
        [productId]: { ...product, accepted: true },
      },
    },
  };
}

function processGadgetWork(state: GameState, elapsedMs: number): GameState {
  const work = state.gadgets.activeWork;
  if (!work || elapsedMs <= 0) return state;
  const speed = getGadgetWorkSpeed(state, work.kind);
  if (speed <= 0) return state;
  const requiredWork = getGadgetWorkRequirement(
    work.productId,
    work.kind,
    work.rarity,
  );
  const completedWorkMs = Math.min(
    requiredWork,
    work.completedWorkMs + elapsedMs * speed,
  );
  if (completedWorkMs < requiredWork) {
    return {
      ...state,
      gadgets: {
        ...state.gadgets,
        activeWork: { ...work, completedWorkMs },
      },
    };
  }
  const product = state.gadgets.products[work.productId];
  const rarityState = product.rarities[work.rarity];
  const minigameSeed = state.randomSeed;
  const [, randomSeed] = nextRandom(state.randomSeed);
  return {
    ...state,
    randomSeed,
    gadgets: {
      ...state.gadgets,
      activeWork: undefined,
      minigame: {
        productId: work.productId,
        kind: work.kind,
        rarity: work.rarity,
        opportunityRarity: work.opportunityRarity,
        seed: minigameSeed,
        previousQuality: rarityState.quality,
        status: "ready",
      },
    },
  };
}

interface SaleResult {
  products: GameState["gadgets"]["products"];
  revenue: number;
  units: number;
}

function applySales(
  products: GameState["gadgets"]["products"],
  productId: GadgetProductId,
  rarity: GadgetRarity,
  units: number,
  extra = false,
): SaleResult {
  if (units <= 0) return { products, revenue: 0, units: 0 };
  const product = products[productId];
  const rarityState = product.rarities[rarity];
  const revenue = roundCurrency(
    getGadgetUnitProfit(productId, rarityState.quality, rarity) * units,
  );
  return {
    products: {
      ...products,
      [productId]: {
        ...product,
        rarities: {
          ...product.rarities,
          [rarity]: {
            ...rarityState,
            unitsSold: rarityState.unitsSold + units,
            extraUnitsSold: rarityState.extraUnitsSold + (extra ? units : 0),
            totalProfit: roundCurrency(rarityState.totalProfit + revenue),
          },
        },
      },
    },
    revenue,
    units,
  };
}

type GadgetSaleTier = "ordinary" | "extra";

function processPrimarySalesPool(
  state: GameState,
  productsAtStart: GameState["gadgets"]["products"],
  attempts: number,
  audience: number,
  tier: GadgetSaleTier,
): SaleResult {
  let products = productsAtStart;
  let revenue = 0;
  let units = 0;
  // La fascia viene fissata all'inizio del tick: nello stesso intervallo un
  // prodotto non può consumare sia capacità ordinaria sia extra.
  const eligible = getSellableGadgetVariants(state).filter(({ productId, rarity }) => {
    const rarityState = state.gadgets.products[productId].rarities[rarity];
    const audienceUnitsSold = getGadgetAudienceUnitsSold(rarityState);
    return tier === "ordinary"
      ? audienceUnitsSold < audience
      : audienceUnitsSold >= audience;
  });
  const totalWeight = eligible.reduce(
    (total, { productId, rarity }) => total + (
      tier === "ordinary"
        ? Math.max(
            0,
            audience - getGadgetAudienceUnitsSold(
              state.gadgets.products[productId].rarities[rarity],
            ),
          )
        : 1
    ),
    0,
  );
  if (attempts <= 0 || totalWeight <= 0) return { products, revenue, units };

  for (const { productId, rarity } of eligible) {
    const product = products[productId];
    const rarityState = product.rarities[rarity];
    const demand = tier === "ordinary"
      ? Math.max(0, audience - getGadgetAudienceUnitsSold(rarityState))
      : Math.max(0, Number.MAX_SAFE_INTEGER - rarityState.unitsSold);
    const weight = tier === "ordinary"
      ? Math.max(
          0,
          audience - getGadgetAudienceUnitsSold(
            state.gadgets.products[productId].rarities[rarity],
          ),
        )
      : 1;
    const allocatedAttempts = attempts * weight / totalWeight;
    const converted = allocatedAttempts * getGadgetQualityConversion(
      rarityState.quality,
      state.upgrades,
    );
    const buffered = Math.min(demand, rarityState.salesRemainder + converted);
    const sold = Math.min(demand, Math.floor(buffered + Number.EPSILON));
    const remainder = sold >= demand
      ? 0
      : Math.max(0, Math.min(0.999999999999, buffered - sold));
    products = {
      ...products,
      [productId]: {
        ...product,
        rarities: {
          ...product.rarities,
          [rarity]: { ...rarityState, salesRemainder: remainder },
        },
      },
    };
    const applied = applySales(products, productId, rarity, sold, tier === "extra");
    products = applied.products;
    revenue = roundCurrency(revenue + applied.revenue);
    units += applied.units;
  }
  return { products, revenue, units };
}

function processPrimarySales(
  state: GameState,
  ordinaryAttempts: number,
  extraAttempts: number,
  audience: number,
): SaleResult {
  const ordinary = processPrimarySalesPool(
    state,
    state.gadgets.products,
    ordinaryAttempts,
    audience,
    "ordinary",
  );
  const extra = processPrimarySalesPool(
    state,
    ordinary.products,
    extraAttempts,
    audience,
    "extra",
  );
  return {
    products: extra.products,
    revenue: roundCurrency(ordinary.revenue + extra.revenue),
    units: ordinary.units + extra.units,
  };
}

function processCrossSales(
  state: GameState,
  products: GameState["gadgets"]["products"],
  primaryUnits: number,
  audience: number,
): SaleResult & { remainder: number; cursor: number } {
  const catalogVariants: SellableGadgetVariant[] = GADGET_PRODUCT_ORDER.flatMap(
    (productId) => {
      const product = products[productId];
      if (!product.accepted) return [];
      return GADGET_RARITY_ORDER.flatMap((rarity) => {
        const rarityState = product.rarities[rarity];
        return rarityState.unlocked && rarityState.quality > 0
          ? [{ productId, rarity }]
          : [];
      });
    },
  );
  if (new Set(catalogVariants.map(({ productId }) => productId)).size < 2) {
    return { products, revenue: 0, units: 0, remainder: 0, cursor: 0 };
  }

  const potential = state.gadgets.crossSellRemainder +
    primaryUnits * getGadgetCrossSellRate(state.upgrades);
  const wholeCapacity = Math.max(0, Math.floor(potential + Number.EPSILON));
  const remainder = Math.max(0, Math.min(0.999999999999, potential - Math.floor(potential)));
  const primarySources = catalogVariants.filter(
    ({ productId, rarity }) =>
      products[productId].rarities[rarity].unitsSold >
        state.gadgets.products[productId].rarities[rarity].unitsSold,
  );
  const eligible = catalogVariants.filter(
    ({ productId, rarity }) =>
      getGadgetAudienceUnitsSold(products[productId].rarities[rarity]) < audience &&
      primarySources.some((source) => source.productId !== productId),
  );
  const totalDemand = eligible.reduce(
    (total, { productId, rarity }) =>
      total + audience - getGadgetAudienceUnitsSold(
        products[productId].rarities[rarity],
      ),
    0,
  );
  const capacity = Math.min(wholeCapacity, totalDemand);
  if (capacity <= 0 || eligible.length === 0) {
    return {
      products,
      revenue: 0,
      units: 0,
      remainder,
      cursor: state.gadgets.crossSellCursor,
    };
  }

  const variantOrder: SellableGadgetVariant[] = GADGET_PRODUCT_ORDER.flatMap(
    (productId) => GADGET_RARITY_ORDER.map((rarity) => ({ productId, rarity })),
  );
  const variantIndex = ({ productId, rarity }: SellableGadgetVariant) =>
    variantOrder.findIndex(
      (candidate) => candidate.productId === productId && candidate.rarity === rarity,
    );
  const variantKey = ({ productId, rarity }: SellableGadgetVariant) =>
    `${productId}:${rarity}`;
  const rotated = [...eligible].sort((left, right) => {
    const start = state.gadgets.crossSellCursor % variantOrder.length;
    const leftOffset = (variantIndex(left) - start + variantOrder.length) %
      variantOrder.length;
    const rightOffset = (variantIndex(right) - start + variantOrder.length) %
      variantOrder.length;
    return leftOffset - rightOffset;
  });
  const allocations = new Map<string, number>();
  let allocated = 0;
  for (const variant of rotated) {
    const rarityState = products[variant.productId].rarities[variant.rarity];
    const demand = audience - getGadgetAudienceUnitsSold(rarityState);
    const share = Math.min(demand, Math.floor(capacity * demand / totalDemand));
    allocations.set(variantKey(variant), share);
    allocated += share;
  }
  let remainderUnits = capacity - allocated;
  while (remainderUnits > 0) {
    let distributed = false;
    for (const variant of rotated) {
      const rarityState = products[variant.productId].rarities[variant.rarity];
      const demand = audience - getGadgetAudienceUnitsSold(rarityState);
      const key = variantKey(variant);
      const current = allocations.get(key) ?? 0;
      if (current >= demand) continue;
      allocations.set(key, current + 1);
      remainderUnits -= 1;
      distributed = true;
      if (remainderUnits <= 0) break;
    }
    if (!distributed) break;
  }

  let nextProducts = products;
  let revenue = 0;
  let units = 0;
  for (const variant of rotated) {
    const applied = applySales(
      nextProducts,
      variant.productId,
      variant.rarity,
      allocations.get(variantKey(variant)) ?? 0,
    );
    nextProducts = applied.products;
    revenue = roundCurrency(revenue + applied.revenue);
    units += applied.units;
  }
  return {
    products: nextProducts,
    revenue,
    units,
    remainder,
    cursor: (state.gadgets.crossSellCursor + units) % variantOrder.length,
  };
}

function unlockProductsFromSales(state: GameState, now: number): GameState {
  let nextState = state;
  for (const productId of GADGET_PRODUCT_ORDER) {
    const nextProductId = getNextGadgetProductId(productId);
    if (!nextProductId) continue;
    const products = nextState.gadgets.products;
    if (
      products[nextProductId].unlocked ||
      getGadgetFamilyUnitsSold(products[productId]) < GADGET_PROJECT_UNLOCK_SALES
    ) continue;
    nextState = {
      ...nextState,
      gadgets: {
        ...nextState.gadgets,
        products: {
          ...products,
          [nextProductId]: { ...products[nextProductId], unlocked: true },
        },
      },
    };
    nextState = addMessage(
      nextState,
      now,
      `${GADGET_DEFINITIONS[nextProductId].name}: nuovo progetto disponibile`,
      `Le vendite di ${GADGET_DEFINITIONS[productId].name} hanno sbloccato un nuovo progetto nel Laboratorio Gadget.`,
      "positive",
      "other",
      "gadget",
    );
  }
  return nextState;
}

function processGadgetSales(
  state: GameState,
  elapsedMs: number,
  now: number,
): GameState {
  if (elapsedMs <= 0) return state;
  const monthlyCapacity = getGadgetMonthlyAttemptCapacity(state);
  if (monthlyCapacity <= 0) return state;
  const elapsedMonths = elapsedMs / GAME_CONFIG.gameMonthMs;
  const ordinaryAttempts = elapsedMonths * monthlyCapacity;
  const extraAttempts = elapsedMonths * getGadgetExtraMonthlyAttemptCapacity(state);
  const audience = getGadgetAudience(state);
  const primary = processPrimarySales(
    state,
    ordinaryAttempts,
    extraAttempts,
    audience,
  );
  const cross = processCrossSales(state, primary.products, primary.units, audience);
  const revenue = roundCurrency(primary.revenue + cross.revenue);
  if (
    revenue <= 0 &&
    primary.products === state.gadgets.products &&
    cross.remainder === state.gadgets.crossSellRemainder
  ) return state;

  const gadgetsWithSales = recordGadgetMonthlyRevenue(
    {
      ...state.gadgets,
      products: cross.products,
      crossSellRemainder: cross.remainder,
      crossSellCursor: cross.cursor,
    },
    state.gadgets.products,
    cross.products,
    state.school.currentMonth,
  );
  const soldState: GameState = {
    ...state,
    school: {
      ...state.school,
      euros: roundCurrency(state.school.euros + revenue),
    },
    statistics: {
      ...state.statistics,
      eurosEarned: roundCurrency(state.statistics.eurosEarned + revenue),
    },
    gadgets: {
      ...gadgetsWithSales,
    },
  };
  return unlockProductsFromSales(soldState, now);
}

export function processGadgets(
  state: GameState,
  elapsedMs: number,
  now: number,
): GameState {
  if (!state.unlocks.gadget || elapsedMs <= 0) return state;
  const progressed = processGadgetWork(state, elapsedMs);
  return processGadgetSales(progressed, elapsedMs, now);
}
