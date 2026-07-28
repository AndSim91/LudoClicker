import {
  GADGET_DEFINITIONS,
  GADGET_PRODUCT_ORDER,
  GADGET_PROJECT_UNLOCK_SALES,
  getGadgetRevisionCost,
  getGadgetWorkRequirement,
  getNextGadgetProductId,
} from "../content/gadgets";
import {
  getGadgetAudience,
  getGadgetCrossSellRate,
  getGadgetMarginalMonthlyAttemptCapacity,
  getGadgetMonthlyAttemptCapacity,
  getGadgetQualityConversion,
  getGadgetUnitProfit,
  getGadgetWorkSpeed,
} from "./gadgetEconomy";
import { roundCurrency } from "./economy";
import { GAME_CONFIG } from "./config";
import { nextRandom } from "./random";
import { addMessage } from "./stateUpdates";
import type {
  GadgetProductId,
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
  const cost = getGadgetRevisionCost(productId);
  if (
    !state.unlocks.gadget ||
    !product?.unlocked ||
    !product.projectPurchased ||
    !product.prototypeCompleted ||
    product.quality >= 100 ||
    state.gadgets.activeWork ||
    (state.gadgets.minigame !== undefined && !resultForProduct) ||
    state.school.euros < cost
  ) return state;

  return {
    ...state,
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
  return {
    ...state,
    gadgets: {
      ...state.gadgets,
      products: {
        ...state.gadgets.products,
        [productId]: {
          ...product,
          prototypeCompleted: true,
          quality: Math.max(product.quality, score),
        },
      },
      minigame: { ...minigame, status: "result", score },
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
  const requiredWork = getGadgetWorkRequirement(work.productId, work.kind);
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
        seed: minigameSeed,
        previousQuality: product.quality,
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
  units: number,
): SaleResult {
  if (units <= 0) return { products, revenue: 0, units: 0 };
  const product = products[productId];
  const revenue = roundCurrency(getGadgetUnitProfit(productId, product.quality) * units);
  return {
    products: {
      ...products,
      [productId]: {
        ...product,
        unitsSold: product.unitsSold + units,
        totalProfit: roundCurrency(product.totalProfit + revenue),
      },
    },
    revenue,
    units,
  };
}

type GadgetSaleTier = "ordinary" | "marginal";

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
  // prodotto non può consumare sia capacità ordinaria sia marginale.
  const eligible = GADGET_PRODUCT_ORDER.filter((productId) => {
    const product = state.gadgets.products[productId];
    if (
      !product.accepted ||
      product.quality <= 0 ||
      product.unitsSold >= Number.MAX_SAFE_INTEGER
    ) return false;
    return tier === "ordinary"
      ? product.unitsSold < audience
      : product.unitsSold >= audience;
  });
  const totalWeight = eligible.reduce(
    (total, productId) => total + (
      tier === "ordinary"
        ? Math.max(0, audience - state.gadgets.products[productId].unitsSold)
        : 1
    ),
    0,
  );
  if (attempts <= 0 || totalWeight <= 0) return { products, revenue, units };

  for (const productId of eligible) {
    const product = products[productId];
    const demand = tier === "ordinary"
      ? Math.max(0, audience - product.unitsSold)
      : Math.max(0, Number.MAX_SAFE_INTEGER - product.unitsSold);
    const weight = tier === "ordinary"
      ? Math.max(0, audience - state.gadgets.products[productId].unitsSold)
      : 1;
    const allocatedAttempts = attempts * weight / totalWeight;
    const converted = allocatedAttempts * getGadgetQualityConversion(
      product.quality,
      state.upgrades,
    );
    const buffered = Math.min(demand, product.salesRemainder + converted);
    const sold = Math.min(demand, Math.floor(buffered + Number.EPSILON));
    const remainder = sold >= demand
      ? 0
      : Math.max(0, Math.min(0.999999999999, buffered - sold));
    products = {
      ...products,
      [productId]: { ...product, salesRemainder: remainder },
    };
    const applied = applySales(products, productId, sold);
    products = applied.products;
    revenue = roundCurrency(revenue + applied.revenue);
    units += applied.units;
  }
  return { products, revenue, units };
}

function processPrimarySales(
  state: GameState,
  ordinaryAttempts: number,
  marginalAttempts: number,
  audience: number,
): SaleResult {
  const ordinary = processPrimarySalesPool(
    state,
    state.gadgets.products,
    ordinaryAttempts,
    audience,
    "ordinary",
  );
  const marginal = processPrimarySalesPool(
    state,
    ordinary.products,
    marginalAttempts,
    audience,
    "marginal",
  );
  return {
    products: marginal.products,
    revenue: roundCurrency(ordinary.revenue + marginal.revenue),
    units: ordinary.units + marginal.units,
  };
}

function processCrossSales(
  state: GameState,
  products: GameState["gadgets"]["products"],
  primaryUnits: number,
  audience: number,
): SaleResult & { remainder: number; cursor: number } {
  const catalogProducts = GADGET_PRODUCT_ORDER.filter((productId) => {
    const product = products[productId];
    return product.accepted && product.quality > 0;
  });
  if (catalogProducts.length < 2) {
    return { products, revenue: 0, units: 0, remainder: 0, cursor: 0 };
  }

  const potential = state.gadgets.crossSellRemainder +
    primaryUnits * getGadgetCrossSellRate(state.upgrades);
  const wholeCapacity = Math.max(0, Math.floor(potential + Number.EPSILON));
  const remainder = Math.max(0, Math.min(0.999999999999, potential - Math.floor(potential)));
  const primarySourceIds = catalogProducts.filter(
    (productId) =>
      products[productId].unitsSold > state.gadgets.products[productId].unitsSold,
  );
  const eligible = catalogProducts.filter(
    (productId) =>
      products[productId].unitsSold < audience &&
      primarySourceIds.some((sourceProductId) => sourceProductId !== productId),
  );
  const totalDemand = eligible.reduce(
    (total, productId) => total + audience - products[productId].unitsSold,
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

  const rotated = [...eligible].sort((left, right) => {
    const start = state.gadgets.crossSellCursor % GADGET_PRODUCT_ORDER.length;
    const leftOffset = (GADGET_PRODUCT_ORDER.indexOf(left) - start + GADGET_PRODUCT_ORDER.length) %
      GADGET_PRODUCT_ORDER.length;
    const rightOffset = (GADGET_PRODUCT_ORDER.indexOf(right) - start + GADGET_PRODUCT_ORDER.length) %
      GADGET_PRODUCT_ORDER.length;
    return leftOffset - rightOffset;
  });
  const allocations = new Map<GadgetProductId, number>();
  let allocated = 0;
  for (const productId of rotated) {
    const demand = audience - products[productId].unitsSold;
    const share = Math.min(demand, Math.floor(capacity * demand / totalDemand));
    allocations.set(productId, share);
    allocated += share;
  }
  let remainderUnits = capacity - allocated;
  while (remainderUnits > 0) {
    let distributed = false;
    for (const productId of rotated) {
      const demand = audience - products[productId].unitsSold;
      const current = allocations.get(productId) ?? 0;
      if (current >= demand) continue;
      allocations.set(productId, current + 1);
      remainderUnits -= 1;
      distributed = true;
      if (remainderUnits <= 0) break;
    }
    if (!distributed) break;
  }

  let nextProducts = products;
  let revenue = 0;
  let units = 0;
  for (const productId of rotated) {
    const applied = applySales(nextProducts, productId, allocations.get(productId) ?? 0);
    nextProducts = applied.products;
    revenue = roundCurrency(revenue + applied.revenue);
    units += applied.units;
  }
  return {
    products: nextProducts,
    revenue,
    units,
    remainder,
    cursor: (state.gadgets.crossSellCursor + units) % GADGET_PRODUCT_ORDER.length,
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
      products[productId].unitsSold < GADGET_PROJECT_UNLOCK_SALES
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
  const marginalAttempts = elapsedMonths *
    getGadgetMarginalMonthlyAttemptCapacity(state);
  const audience = getGadgetAudience(state);
  const primary = processPrimarySales(
    state,
    ordinaryAttempts,
    marginalAttempts,
    audience,
  );
  const cross = processCrossSales(state, primary.products, primary.units, audience);
  const revenue = roundCurrency(primary.revenue + cross.revenue);
  if (
    revenue <= 0 &&
    primary.products === state.gadgets.products &&
    cross.remainder === state.gadgets.crossSellRemainder
  ) return state;

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
      ...state.gadgets,
      products: cross.products,
      crossSellRemainder: cross.remainder,
      crossSellCursor: cross.cursor,
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
