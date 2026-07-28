import { describe, expect, it } from "vitest";
import {
  GADGET_DEFINITIONS,
  GADGET_PROJECT_UNLOCK_SALES,
  getGadgetRevisionCost,
  getGadgetWorkRequirement,
} from "../content/gadgets";
import { createInitialCollaboratorMastery } from "../content/mastery";
import {
  acceptGadgetProduct,
  completeGadgetMinigame,
  processGadgets,
  startGadgetMinigame,
  startGadgetProject,
  startGadgetRevision,
  unlockGadgetSector,
  unlockGadgetSectorFromTournamentResult,
} from "./gadgetFlow";
import { getGadgetAudience, getGadgetWorkSpeed } from "./gadgetEconomy";
import { createInitialState } from "./initialState";
import type { Collaborator, GameState, TournamentResult } from "./types";

function gadgetCollaborator(id = "gadget-collaborator"): Collaborator {
  return {
    id,
    contactId: `contact-${id}`,
    displayName: "Collaboratore Gadget",
    joinedAt: 1_000,
    forms: [],
    instructorForms: [],
    assignment: "gadget",
    mastery: createInitialCollaboratorMastery(),
    rarity: "ultra-rare",
  };
}

function unlockedState(): GameState {
  const initial = createInitialState(1_000, "Manager");
  return unlockGadgetSector({
    ...initial,
    school: {
      ...initial.school,
      activeMembers: 10_000,
      peakActiveMembers: 10_000,
      euros: 200_000,
    },
    collaborators: [gadgetCollaborator()],
  }, 1_000);
}

function completeCurrentWork(state: GameState): GameState {
  const work = state.gadgets.activeWork!;
  const remaining = getGadgetWorkRequirement(work.productId, work.kind) -
    work.completedWorkMs;
  return processGadgets(state, remaining / getGadgetWorkSpeed(state, work.kind), 2_000);
}

function tournamentResult(
  level: TournamentResult["level"],
  ownedArenaWinner: boolean,
): TournamentResult {
  return {
    id: "result",
    level,
    season: 1,
    completedAt: 1_000,
    participants: [{
      id: "arena-winner",
      ownedContactId: ownedArenaWinner ? "owned" : undefined,
      firstName: "Ada",
      lastName: "Arena",
      schoolName: "Scuola",
      city: "Genova",
      rarity: "rare",
      numericForms: 1,
      experience: 0,
      arenaBase: 1,
      styleBase: 1,
      arenaPreparation: 1,
      stylePreparation: 1,
      condition: 1,
    }],
    matches: [],
    groupStandings: [],
    arenaRanking: ["arena-winner"],
    styleRanking: ["arena-winner"],
    arenaPodium: [],
    stylePodium: [],
    qualifiers: [],
    rewards: [],
    secretLegendaryDefeatedIds: [],
  };
}

describe("Gadget flow", () => {
  it("unlocks only after an owned Arena victory at Academy level", () => {
    const initial = createInitialState(1_000, "Manager");

    expect(unlockGadgetSectorFromTournamentResult(
      initial,
      tournamentResult("academy", true),
      2_000,
    ).unlocks.gadget).toBe(true);
    expect(unlockGadgetSectorFromTournamentResult(
      initial,
      tournamentResult("academy", false),
      2_000,
    )).toBe(initial);
    expect(unlockGadgetSectorFromTournamentResult(
      initial,
      tournamentResult("national", true),
      2_000,
    )).toBe(initial);
  });

  it("charges the project, completes it with collaborators and never lowers quality", () => {
    const ready = unlockedState();
    const paid = startGadgetProject(ready, "wristband");

    expect(paid.school.euros).toBe(
      ready.school.euros - GADGET_DEFINITIONS.wristband.projectCost,
    );
    expect(paid.gadgets.products.wristband.projectPurchased).toBe(true);

    const prototypeReady = completeCurrentWork(paid);
    expect(prototypeReady.gadgets.activeWork).toBeUndefined();
    expect(prototypeReady.gadgets.minigame).toMatchObject({
      productId: "wristband",
      status: "ready",
    });

    const firstResult = completeGadgetMinigame(
      startGadgetMinigame(prototypeReady, "wristband"),
      "wristband",
      75,
    );
    expect(firstResult.gadgets.products.wristband.quality).toBe(75);

    const revisionStarted = startGadgetRevision(firstResult, "wristband");
    expect(revisionStarted.school.euros).toBe(
      firstResult.school.euros - getGadgetRevisionCost("wristband"),
    );
    const revised = completeGadgetMinigame(
      startGadgetMinigame(completeCurrentWork(revisionStarted), "wristband"),
      "wristband",
      20,
    );
    expect(revised.gadgets.products.wristband.quality).toBe(75);
    expect(revised.gadgets.minigame?.score).toBe(20);
  });

  it("sells from the shared audience and credits the quality-based net profit", () => {
    const initial = unlockedState();
    const product = initial.gadgets.products.wristband;
    const selling: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...product,
            projectPurchased: true,
            prototypeCompleted: true,
            accepted: true,
            quality: 100,
          },
        },
      },
    };

    const sold = processGadgets(selling, 60_000, 61_000);

    expect(getGadgetAudience(selling)).toBe(1_000);
    expect(sold.gadgets.products.wristband.unitsSold).toBe(5);
    expect(sold.gadgets.products.wristband.totalProfit).toBe(100);
    expect(sold.school.euros).toBe(selling.school.euros + 100);
  });

  it("keeps quality zero non-sellable and unlocks the next project at 100 sales", () => {
    const initial = unlockedState();
    const baseProduct = initial.gadgets.products.wristband;
    const zeroQuality: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...baseProduct,
            projectPurchased: true,
            prototypeCompleted: true,
            accepted: true,
            quality: 0,
          },
        },
      },
    };
    expect(processGadgets(zeroQuality, 60_000, 61_000).gadgets.products.wristband.unitsSold).toBe(0);

    const nearlyUnlocked: GameState = {
      ...zeroQuality,
      gadgets: {
        ...zeroQuality.gadgets,
        products: {
          ...zeroQuality.gadgets.products,
          wristband: {
            ...zeroQuality.gadgets.products.wristband,
            quality: 100,
            unitsSold: GADGET_PROJECT_UNLOCK_SALES - 1,
          },
        },
      },
    };
    const unlocked = processGadgets(nearlyUnlocked, 60_000, 61_000);
    expect(unlocked.gadgets.products.wristband.unitsSold).toBe(104);
    expect(unlocked.gadgets.products.mug.unlocked).toBe(true);
  });

  it("allows accepting a zero-quality prototype without making it sell", () => {
    const ready = completeCurrentWork(startGadgetProject(unlockedState(), "wristband"));
    const result = completeGadgetMinigame(
      startGadgetMinigame(ready, "wristband"),
      "wristband",
      0,
    );
    const accepted = acceptGadgetProduct(result, "wristband");

    expect(accepted.gadgets.products.wristband.accepted).toBe(true);
    expect(accepted.gadgets.products.wristband.quality).toBe(0);
    expect(processGadgets(accepted, 60_000, 10_000).gadgets.products.wristband.unitsSold).toBe(0);
  });

  it("uses one shared commercial pool and adds deterministic cross-sales", () => {
    const initial = unlockedState();
    const selling: GameState = {
      ...initial,
      upgrades: {
        ...initial.upgrades,
        "gadget-order-management": 5,
        "gadget-cross-selling": 5,
      },
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...initial.gadgets.products.wristband,
            projectPurchased: true,
            prototypeCompleted: true,
            accepted: true,
            quality: 100,
          },
          mug: {
            ...initial.gadgets.products.mug,
            unlocked: true,
            projectPurchased: true,
            prototypeCompleted: true,
            accepted: true,
            quality: 100,
          },
        },
      },
    };

    const sold = processGadgets(selling, 60_000, 61_000);
    const wristbands = sold.gadgets.products.wristband.unitsSold;
    const mugs = sold.gadgets.products.mug.unitsSold;

    expect(wristbands + mugs).toBe(12);
    expect(sold.gadgets.crossSellRemainder).toBeCloseTo(0.5);
    expect(sold.gadgets.products.wristband.totalProfit).toBe(120);
    expect(sold.gadgets.products.mug.totalProfit).toBe(180);
  });

  it("never turns a cross-sale into another unit of the same product", () => {
    const initial = unlockedState();
    const audience = getGadgetAudience(initial);
    const selling: GameState = {
      ...initial,
      upgrades: {
        ...initial.upgrades,
        "gadget-order-management": 5,
        "gadget-cross-selling": 5,
      },
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...initial.gadgets.products.wristband,
            projectPurchased: true,
            prototypeCompleted: true,
            accepted: true,
            quality: 100,
          },
          mug: {
            ...initial.gadgets.products.mug,
            unlocked: true,
            projectPurchased: true,
            prototypeCompleted: true,
            accepted: true,
            quality: 100,
            unitsSold: audience,
          },
        },
      },
    };

    const sold = processGadgets(selling, 60_000, 61_000);

    expect(sold.gadgets.products.wristband.unitsSold).toBe(10);
    expect(sold.gadgets.products.mug.unitsSold).toBe(audience);
    expect(sold.gadgets.crossSellRemainder).toBeCloseTo(0.5);
  });
});
