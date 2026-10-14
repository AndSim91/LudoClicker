import type { MigratableState } from "./types";

/*
 * v115 (14/10/2026): Social and Gadget, once opened in any school, stay open in
 * every later one (Andrea). A save whose career already shows them gets them now:
 * Social from the followers ever gained, Gadget from a Nazionale won, a gadget sold
 * or a Maestria Gadget saved. Followers already in the school are kept; the Gadget
 * open on the first product only, like a new Laboratorio.
 */
export function migrateCareerUnlocksState(state: MigratableState): MigratableState {
  if (state.version !== 114) return state;
  const statistics = state.statistics as {
    socialFollowersGained?: number;
    career?: { nationalTitles?: number; gadgetsSold?: number };
  } | undefined;
  const network = state.network as { gadgetMastery?: Record<string, unknown> } | undefined;
  const gadgets = state.gadgets as { products?: Record<string, { unlocked?: boolean }> } | undefined;
  const school = state.school as { followers?: number } | undefined;
  const hadSocial = (statistics?.socialFollowersGained ?? 0) > 0;
  const hadGadget = (statistics?.career?.nationalTitles ?? 0) > 0 ||
    (statistics?.career?.gadgetsSold ?? 0) > 0 ||
    Object.keys(network?.gadgetMastery ?? {}).length > 0;
  const openSocial = hadSocial && !state.unlocks?.social;
  const openGadget = hadGadget && !state.unlocks?.gadget && Boolean(gadgets?.products?.keychain);
  if (!openSocial && !openGadget) return { ...state, version: 115 };
  return {
    ...state,
    version: 115,
    unlocks: {
      ...state.unlocks,
      ...(openSocial ? { social: true } : {}),
      ...(openGadget ? { gadget: true } : {}),
    },
    ...(openSocial && school ? { school: { ...school, followers: school.followers ?? 0 } } : {}),
    ...(openGadget && gadgets?.products ? {
      gadgets: {
        ...gadgets,
        products: { ...gadgets.products, keychain: { ...gadgets.products.keychain, unlocked: true } },
      },
    } : {}),
  } as MigratableState;
}
