import type { MigratableState } from "./types";

/*
 * v113 (13/10/2026): the Gadget open with the first Nazionale won (Andrea; before,
 * the Champion's). A school that already won it gets the Laboratorio now; the scene
 * and the tutorial follow from `unlocks.gadget` as usual.
 */
export function migrateGadgetAtNationalState(state: MigratableState): MigratableState {
  if (state.version !== 112) return state;
  const wonNational = (state.tournaments?.nationalTitlesCurrentSchool ?? 0) > 0;
  const gadgets = state.gadgets as { products?: Record<string, { unlocked?: boolean }> } | undefined;
  if (!wonNational || state.unlocks?.gadget || !gadgets?.products?.keychain) {
    return { ...state, version: 113 };
  }
  return {
    ...state,
    version: 113,
    unlocks: { ...state.unlocks, gadget: true },
    gadgets: {
      ...gadgets,
      products: {
        ...gadgets.products,
        keychain: { ...gadgets.products.keychain, unlocked: true },
      },
    },
  } as MigratableState;
}
