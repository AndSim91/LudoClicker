import { describe, expect, it } from "vitest";
import { getGadgetWorkRequirement } from "../content/gadgets";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { addAdminMembers } from "./adminFlow";
import { getGadgetWorkSpeed } from "./gadgetEconomy";
import {
  completeGadgetMinigame,
  processGadgets,
  startGadgetMinigame,
  startGadgetProject,
  startGadgetRevision,
  unlockGadgetSector,
} from "./gadgetFlow";
import { syncGadgetMastery } from "./gadgetRarity";
import { isValidGadgetMastery } from "./gadgetState";
import { createInitialState } from "./initialState";
import { foundSchool } from "./schoolProgressionFlow";
import type { GadgetRarity, GameState } from "./types";

function gadgetSchool(mastery?: Partial<Record<"wristband", GadgetRarity[]>>): GameState {
  const initial = createInitialState(1_000, "Manager");
  const state = unlockGadgetSector({
    ...initial,
    school: { ...initial.school, activeMembers: 10_000, peakActiveMembers: 10_000, euros: 200_000 },
    collaborators: [{
      id: "g",
      contactId: "contact-g",
      displayName: "Collaboratore Gadget",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      assignment: "gadget",
      mastery: createInitialCollaboratorMastery(),
      rarity: "ultra-rare",
    }],
  }, 1_000);
  return {
    ...state,
    network: { ...state.network, gadgetMastery: mastery },
    gadgets: {
      ...state.gadgets,
      products: {
        ...state.gadgets.products,
        wristband: { ...state.gadgets.products.wristband, unlocked: true },
      },
    },
  };
}

function finishWork(state: GameState): GameState {
  const work = state.gadgets.activeWorks[0];
  const remaining = getGadgetWorkRequirement(work.productId, work.kind, work.rarity) - work.completedWorkMs;
  return processGadgets(state, remaining / getGadgetWorkSpeed(state, work.kind), 2_000);
}

/** Wristband on sale, Comune at the given quality, enough sales for a sure Raro opportunity. */
function sellingWristband(quality: number, mastery?: GadgetRarity[]): GameState {
  const state = gadgetSchool(mastery && { wristband: mastery });
  const product = state.gadgets.products.wristband;
  return {
    ...state,
    gadgets: {
      ...state.gadgets,
      products: {
        ...state.gadgets.products,
        wristband: {
          ...product,
          projectPurchased: true,
          prototypeCompleted: true,
          accepted: true,
          rarities: {
            ...product.rarities,
            common: { ...product.rarities.common, unlocked: true, quality, unitsSold: 1_000 },
          },
        },
      },
    },
  };
}

describe("Maestria dei gadget", () => {
  it("records 100% only for that product and rarity, and keeps it in the next school", () => {
    const played = startGadgetMinigame(finishWork(startGadgetProject(gadgetSchool(), "wristband")), "wristband");
    const imperfect = syncGadgetMastery(completeGadgetMinigame(played, "wristband", 99));
    expect(imperfect.network.gadgetMastery).toBeUndefined();

    const perfect = syncGadgetMastery(completeGadgetMinigame(played, "wristband", 100));
    expect(perfect.network.gadgetMastery).toEqual({ wristband: ["common"] });
    expect(syncGadgetMastery(perfect)).toBe(perfect);

    const ready = addAdminMembers(perfect, 125 - perfect.school.activeMembers);
    const next = foundSchool(
      { ...ready, school: { ...ready.school, fame: 5_000 }, tournaments: { ...ready.tournaments, nationalTitlesCurrentSchool: 1 } },
      { name: "Ordine del Faro", city: "Trieste" },
      2_000,
    );
    expect(next.network.gadgetMastery).toEqual({ wristband: ["common"] });
    expect(next.gadgets.products.wristband.rarities.common.quality).toBe(0);
  });

  it("skips the collaudo of a mastered rarity: development is paid and waited, quality is 100", () => {
    const started = startGadgetProject(gadgetSchool({ wristband: ["common"] }), "wristband");
    expect(started.gadgets.activeWorks[0]).toBeDefined();
    const done = finishWork(started);
    expect(done.gadgets.minigame).toBeUndefined();
    expect(done.gadgets.products.wristband).toMatchObject({ prototypeCompleted: true });
    expect(done.gadgets.products.wristband.rarities.common).toMatchObject({ unlocked: true, quality: 100 });
  });

  it("counts the 100% given to the previous rarity when the next one unlocks", () => {
    const revising = startGadgetRevision(sellingWristband(60), "wristband");
    expect(revising.gadgets.activeWorks[0]?.opportunityRarity).toBe("rare");
    const played = startGadgetMinigame(finishWork(revising), "wristband");
    const unlocked = syncGadgetMastery(completeGadgetMinigame(played, "wristband", 70));
    expect(unlocked.network.gadgetMastery).toEqual({ wristband: ["common"] });
    expect(unlocked.gadgets.products.wristband.rarities.rare).toMatchObject({ unlocked: true, quality: 70 });
  });

  it("plays the new rarity's collaudo when only the current one is mastered", () => {
    const revising = startGadgetRevision(sellingWristband(100, ["common"]), "wristband");
    expect(revising.gadgets.activeWorks[0]?.opportunityRarity).toBe("rare");
    expect(finishWork(revising).gadgets.minigame?.status).toBe("ready");

    const bothMastered = finishWork(startGadgetRevision(sellingWristband(100, ["common", "rare"]), "wristband"));
    expect(bothMastered.gadgets.minigame).toBeUndefined();
    expect(bothMastered.gadgets.products.wristband.rarities.rare.unlocked).toBe(true);
    expect(bothMastered.gadgets.products.wristband.rarities.rare.quality).toBe(100);
  });

  it("validates the saved mastery", () => {
    expect(isValidGadgetMastery(undefined)).toBe(true);
    expect(isValidGadgetMastery({ wristband: ["common", "rare"] })).toBe(true);
    expect(isValidGadgetMastery({ wristband: ["mythic"] })).toBe(false);
    expect(isValidGadgetMastery({ spoon: ["common"] })).toBe(false);
  });
});
