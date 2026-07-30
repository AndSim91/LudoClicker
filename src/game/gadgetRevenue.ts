import { GADGET_PRODUCT_ORDER } from "../content/gadgets";
import { roundCurrency } from "./economy";
import { getGadgetFamilyProfit } from "./gadgetRarity";
import type {
  GadgetMonthlyRevenueState,
  GadgetProductId,
  GadgetProductState,
  GadgetState,
} from "./types";

function createProductRecord<T>(createValue: () => T): Record<GadgetProductId, T> {
  return Object.fromEntries(
    GADGET_PRODUCT_ORDER.map((productId) => [productId, createValue()]),
  ) as Record<GadgetProductId, T>;
}

export function createInitialGadgetMonthlyRevenueState(
  month: number,
): GadgetMonthlyRevenueState {
  return {
    month: Math.max(1, Math.floor(month)),
    totals: createProductRecord(() => 0),
  };
}

export function resetGadgetMonthlyRevenueForMonth(
  gadgets: GadgetState,
  month: number,
): GadgetState {
  return {
    ...gadgets,
    monthlyRevenue: createInitialGadgetMonthlyRevenueState(month),
  };
}

export function recordGadgetMonthlyRevenue(
  gadgets: GadgetState,
  productsBefore: Record<GadgetProductId, GadgetProductState>,
  productsAfter: Record<GadgetProductId, GadgetProductState>,
  month: number,
): GadgetState {
  const currentMonthlyRevenue = gadgets.monthlyRevenue;
  const monthlyRevenue = currentMonthlyRevenue?.month === month
    ? currentMonthlyRevenue
    : createInitialGadgetMonthlyRevenueState(month);
  let changed = monthlyRevenue !== currentMonthlyRevenue;
  const totals = { ...monthlyRevenue.totals };

  for (const productId of GADGET_PRODUCT_ORDER) {
    const delta = roundCurrency(
      getGadgetFamilyProfit(productsAfter[productId]) -
        getGadgetFamilyProfit(productsBefore[productId]),
    );
    if (delta <= 0) continue;
    changed = true;
    totals[productId] = roundCurrency(totals[productId] + delta);
  }

  if (!changed) return gadgets;
  return {
    ...gadgets,
    monthlyRevenue: {
      month,
      totals,
    },
  };
}
