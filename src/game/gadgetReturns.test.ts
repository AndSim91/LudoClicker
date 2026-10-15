import { describe, expect, it } from "vitest";
import { addAdminMembers } from "./adminFlow";
import { unlockGadgetSector } from "./gadgetFlow";
import { restoreCareerGadgets, syncGadgetBest } from "./gadgetReturns";
import { isValidGadgetBest } from "./gadgetState";
import { createInitialState } from "./initialState";
import { foundSchool } from "./schoolProgressionFlow";
import type { GadgetProductId, GadgetRarity, GameState } from "./types";
import { selectDayNotifications } from "../features/day-panel/dayNotifications";

type Best = NonNullable<GameState["network"]["gadgetBest"]>;

function school(best: Best): GameState {
  const state = unlockGadgetSector(createInitialState(1_000, "Manager"), 1_000);
  return { ...state, network: { ...state.network, gadgetBest: best } };
}

function sold(state: GameState, productId: GadgetProductId, rarity: GadgetRarity, units: number): GameState {
  const product = state.gadgets.products[productId];
  return {
    ...state,
    gadgets: {
      ...state.gadgets,
      products: {
        ...state.gadgets.products,
        [productId]: {
          ...product,
          rarities: { ...product.rarities, [rarity]: { ...product.rarities[rarity], unitsSold: units } },
        },
      },
    },
  };
}

const BEST: Best = {
  keychain: { common: 100, rare: 100, "ultra-rare": 70 },
  "sticker-set": { common: 80 },
};

describe("Gadget di carriera (15/10/2026)", () => {
  it("brings back the keychain, then its rarities every 25 sales and the next product at 100", () => {
    const start = restoreCareerGadgets(school(BEST), 2_000);
    expect(start.gadgets.products.keychain).toMatchObject({ unlocked: true, accepted: true, projectPurchased: true });
    expect(start.gadgets.products.keychain.rarities.common).toMatchObject({ unlocked: true, quality: 100 });
    expect(start.gadgets.products.keychain.rarities.rare.unlocked).toBe(false);

    const at24 = restoreCareerGadgets(sold(start, "keychain", "common", 24), 3_000);
    expect(at24.gadgets.products.keychain.rarities.rare.unlocked).toBe(false);
    const at25 = restoreCareerGadgets(sold(start, "keychain", "common", 25), 3_000);
    expect(at25.gadgets.products.keychain.rarities.rare).toMatchObject({ unlocked: true, quality: 100 });

    // Ultra Raro at 50 with its own quality; never-reached Leggendario stays locked at 75.
    const at75 = restoreCareerGadgets(sold(at25, "keychain", "rare", 50), 4_000);
    expect(at75.gadgets.products.keychain.rarities["ultra-rare"]).toMatchObject({ unlocked: true, quality: 70 });
    expect(at75.gadgets.products.keychain.rarities.legendary.unlocked).toBe(false);
    expect(at75.gadgets.products["sticker-set"].accepted).toBe(false);

    const at100 = restoreCareerGadgets(sold(at75, "keychain", "ultra-rare", 25), 5_000);
    expect(at100.gadgets.products["sticker-set"]).toMatchObject({ unlocked: true, accepted: true });
    expect(at100.gadgets.products["sticker-set"].rarities.common.quality).toBe(80);
    // Never on sale before: the wristband waits for its usual project.
    const wristbandReady = restoreCareerGadgets(sold(at100, "sticker-set", "common", 100), 6_000);
    expect(wristbandReady.gadgets.products.wristband.accepted).toBe(false);
    expect(wristbandReady.gadgets.returns?.map(({ productId, rarity }) => `${productId}:${rarity}`)).toEqual([
      "keychain:common", "keychain:rare", "keychain:ultra-rare", "sticker-set:common",
    ]);
  });

  it("leaves a product the player already bought to the usual project", () => {
    const state = school({ keychain: { common: 90 } });
    const bought = {
      ...state,
      gadgets: {
        ...state.gadgets,
        products: {
          ...state.gadgets.products,
          keychain: { ...state.gadgets.products.keychain, projectPurchased: true },
        },
      },
    };
    expect(restoreCareerGadgets(bought, 2_000)).toBe(bought);
  });

  it("keeps the best quality of what is on sale and carries it to the next school", () => {
    const state = school({});
    const keychain = state.gadgets.products.keychain;
    const onSale: GameState = {
      ...state,
      gadgets: {
        ...state.gadgets,
        products: {
          ...state.gadgets.products,
          keychain: {
            ...keychain,
            projectPurchased: true,
            prototypeCompleted: true,
            accepted: true,
            rarities: { ...keychain.rarities, common: { ...keychain.rarities.common, unlocked: true, quality: 64 } },
          },
          // A prototype never put on sale does not count.
          "sticker-set": {
            ...state.gadgets.products["sticker-set"],
            rarities: {
              ...keychain.rarities,
              common: { ...keychain.rarities.common, unlocked: true, quality: 90 },
            },
          },
        },
      },
    };
    const synced = syncGadgetBest(onSale);
    expect(synced.network.gadgetBest).toEqual({ keychain: { common: 64 } });
    expect(syncGadgetBest(synced)).toBe(synced);
    expect(isValidGadgetBest(synced.network.gadgetBest)).toBe(true);
    expect(isValidGadgetBest({ keychain: { common: 101 } })).toBe(false);

    const ready = addAdminMembers(onSale, 125 - onSale.school.activeMembers);
    const next = foundSchool(
      {
        ...ready,
        school: { ...ready.school, fame: 5_000 },
        statistics: { ...ready.statistics, eurosEarned: 50_000 },
        tournaments: { ...ready.tournaments, nationalTitlesCurrentSchool: 1 },
      },
      { name: "Ordine del Faro", city: "Trieste" },
      2_000,
    );
    expect(next.network.gadgetBest).toEqual({ keychain: { common: 64 } });
    // 15/10/2026: the Inflazione di Luce measures this school's earnings, not the career.
    expect(next.lightInflation.eurosEarnedAtCheck).toBeGreaterThanOrEqual(50_000);
    expect(next.lightInflation.eurosEarnedAtCheck).toBe(next.statistics.eurosEarned);
    expect(next.gadgets.products.keychain).toMatchObject({ accepted: true });
    expect(next.gadgets.products.keychain.rarities.common.quality).toBe(64);
    const cards = selectDayNotifications(next, 2_000).filter(({ id }) => id.startsWith("gadget-return"));
    expect(cards.map(({ title }) => title)).toEqual(["Portachiavi Comune torna in vetrina"]);
  });
});
