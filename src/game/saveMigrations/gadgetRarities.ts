import { GADGET_PRODUCT_ORDER } from "../../content/gadgets";
import { createInitialGadgetProductState } from "../gadgetState";
import type {
  GadgetMinigameState,
  GadgetProductId,
  GadgetWorkState,
  GameState,
} from "../types";
import type { MigratableState } from "./types";

interface LegacyGadgetProductState {
  unlocked: boolean;
  projectPurchased: boolean;
  prototypeCompleted: boolean;
  accepted: boolean;
  quality: number;
  unitsSold: number;
  totalProfit: number;
  salesRemainder: number;
}

type LegacyGadgetWorkState = Omit<GadgetWorkState, "rarity" | "opportunityRarity">;
type LegacyGadgetMinigameState = Omit<
  GadgetMinigameState,
  "rarity" | "opportunityRarity" | "unlockedRarity"
>;

interface LegacyGadgetState {
  products: Record<GadgetProductId, LegacyGadgetProductState>;
  activeWork?: LegacyGadgetWorkState;
  minigame?: LegacyGadgetMinigameState;
  crossSellRemainder: number;
  crossSellCursor: number;
}

function migrateProduct(
  legacy: LegacyGadgetProductState | undefined,
): GameState["gadgets"]["products"][GadgetProductId] {
  const product = createInitialGadgetProductState(legacy?.unlocked ?? false);
  if (!legacy) return product;
  return {
    ...product,
    unlocked: legacy.unlocked ?? false,
    projectPurchased: legacy.projectPurchased ?? false,
    prototypeCompleted: legacy.prototypeCompleted ?? false,
    accepted: legacy.accepted ?? false,
    rarities: {
      ...product.rarities,
      common: {
        ...product.rarities.common,
        unlocked: Boolean(legacy.prototypeCompleted || legacy.accepted),
        quality: legacy.quality ?? 0,
        unitsSold: legacy.unitsSold ?? 0,
        totalProfit: legacy.totalProfit ?? 0,
        salesRemainder: legacy.salesRemainder ?? 0,
      },
    },
  };
}

export function migrateGadgetRarityState(
  state: MigratableState,
): MigratableState {
  if (state.version !== 67) return state;
  const legacy = state.gadgets as unknown as LegacyGadgetState | undefined;
  if (!legacy) return { ...state, version: 68 };
  const alreadyMigrated = GADGET_PRODUCT_ORDER.every(
    (productId) => Boolean(
      (legacy.products?.[productId] as unknown as { rarities?: unknown } | undefined)
        ?.rarities,
    ),
  );
  if (alreadyMigrated) return { ...state, version: 68 };

  return {
    ...state,
    version: 68,
    gadgets: {
      products: Object.fromEntries(
        GADGET_PRODUCT_ORDER.map((productId) => [
          productId,
          migrateProduct(legacy.products?.[productId]),
        ]),
      ) as GameState["gadgets"]["products"],
      activeWork: legacy.activeWork
        ? { ...legacy.activeWork, rarity: "common" }
        : undefined,
      minigame: legacy.minigame
        ? { ...legacy.minigame, rarity: "common" }
        : undefined,
      crossSellRemainder: legacy.crossSellRemainder ?? 0,
      crossSellCursor: legacy.crossSellCursor ?? 0,
    } as unknown as GameState["gadgets"],
  };
}
