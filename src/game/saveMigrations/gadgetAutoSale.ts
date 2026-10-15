import type { MigratableState } from "./types";

/*
 * v118 (15/10/2026): a finished collaudo puts the product on sale at once, «Metti in vendita»
 * is gone (Andrea). Prototypes already tested and still waiting for it go on sale now.
 */
export function migrateGadgetAutoSaleState(state: MigratableState): MigratableState {
  if (state.version !== 117) return state;
  const gadgets = state.gadgets as
    | { products?: Record<string, { prototypeCompleted?: boolean; accepted?: boolean }> }
    | undefined;
  const products = gadgets?.products;
  if (!products) return { ...state, version: 118 };
  return {
    ...state,
    version: 118,
    gadgets: {
      ...gadgets,
      products: Object.fromEntries(Object.entries(products).map(([id, product]) => [
        id,
        product.prototypeCompleted && !product.accepted ? { ...product, accepted: true } : product,
      ])),
    },
  } as MigratableState;
}
