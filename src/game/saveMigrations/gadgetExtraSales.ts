import { GADGET_PRODUCT_ORDER } from "../../content/gadgets";
import { GADGET_RARITY_ORDER } from "../../content/gadgetRarities";
import { getGadgetAudience } from "../gadgetEconomy";
import type { GameState } from "../types";
import type { MigratableState } from "./types";

export function migrateGadgetExtraSalesState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 77) return state;
  if (!state.gadgets?.products) return { ...state, version: 78 };

  const audience = getGadgetAudience(state as GameState);
  return {
    ...state,
    version: 78,
    gadgets: {
      ...state.gadgets,
      products: Object.fromEntries(
        GADGET_PRODUCT_ORDER.map((productId) => {
          const product = state.gadgets!.products![productId];
          if (!product?.rarities) return [productId, product];
          return [
            productId,
            {
              ...product,
              rarities: Object.fromEntries(
                GADGET_RARITY_ORDER.map((rarity) => {
                  const rarityState = product.rarities![rarity];
                  if (!rarityState) return [rarity, rarityState];
                  const unitsSold = Number.isSafeInteger(rarityState.unitsSold)
                    ? Math.max(0, rarityState.unitsSold as number)
                    : 0;
                  return [
                    rarity,
                    {
                      ...rarityState,
                      extraUnitsSold: Math.max(0, unitsSold - audience),
                    },
                  ];
                }),
              ) as GameState["gadgets"]["products"][typeof productId]["rarities"],
            },
          ];
        }),
      ) as GameState["gadgets"]["products"],
    },
  };
}
