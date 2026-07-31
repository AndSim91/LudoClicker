import { GADGET_PRODUCT_ORDER } from "../../content/gadgets";
import { createInitialGadgetProductState } from "../gadgetState";
import type { GadgetProductId, GadgetProductState, GameState } from "../types";
import type { MigratableState } from "./types";

/**
 * Inserts the catalog families added after the original five-product catalog.
 * Existing product progress is copied verbatim; only the new bridge products
 * needed to keep an old save's progression reachable are opened automatically.
 */
export function migrateGadgetCatalogState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 80) return state;
  if (!state.gadgets) return { ...state, version: 81 };

  const existingProducts = state.gadgets.products as Partial<
    Record<GadgetProductId, GadgetProductState>
  > | undefined;
  const legacyProducts = existingProducts as Partial<
    Record<"wristband" | "mug" | "underwear" | "tshirt" | "hoodie", GadgetProductState>
  > | undefined;
  const gadgetUnlocked = Boolean(
    state.unlocks?.gadget || legacyProducts?.wristband?.unlocked,
  );
  const bridgeUnlocks: Partial<Record<GadgetProductId, boolean>> = {
    keychain: gadgetUnlocked,
    "sticker-set": gadgetUnlocked,
    cap: Boolean(
      legacyProducts?.underwear?.unlocked ||
        legacyProducts?.tshirt?.unlocked ||
        legacyProducts?.hoodie?.unlocked,
    ),
    "sports-tshirt": Boolean(legacyProducts?.hoodie?.unlocked),
    "custom-hilt": false,
  };
  const products = Object.fromEntries(
    GADGET_PRODUCT_ORDER.map((productId) => {
      const existing = existingProducts?.[productId];
      const unlockedBridgeProduct = bridgeUnlocks[productId] === true;
      return [
        productId,
        existing
          ? unlockedBridgeProduct
            ? { ...existing, unlocked: true }
            : existing
          : createInitialGadgetProductState(unlockedBridgeProduct),
      ];
    }),
  ) as GameState["gadgets"]["products"];
  const existingTotals = state.gadgets.monthlyRevenue?.totals as
    | Partial<Record<GadgetProductId, number>>
    | undefined;
  const totals = Object.fromEntries(
    GADGET_PRODUCT_ORDER.map((productId) => [productId, existingTotals?.[productId] ?? 0]),
  ) as GameState["gadgets"]["monthlyRevenue"]["totals"];

  return {
    ...state,
    version: 81,
    gadgets: {
      ...state.gadgets,
      products,
      monthlyRevenue: state.gadgets.monthlyRevenue
        ? { ...state.gadgets.monthlyRevenue, totals }
        : state.gadgets.monthlyRevenue,
    },
  };
}
