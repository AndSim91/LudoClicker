import { describe, expect, it } from "vitest";
import {
  GADGET_DEFINITIONS,
  GADGET_PROJECT_UNLOCK_SALES,
  getGadgetRevisionCost,
  getGadgetWorkRequirement,
} from "../content/gadgets";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { GAME_CONFIG } from "./config";
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
import {
  getGadgetAudience,
  getGadgetMarginalMonthlyAttemptCapacity,
  getGadgetMonthlyAttemptCapacity,
  getGadgetWorkSpeed,
} from "./gadgetEconomy";
import { createInitialState } from "./initialState";
import type {
  Collaborator,
  GadgetProductState,
  GadgetRarityState,
  GameState,
  TournamentResult,
} from "./types";

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

function withCommonRarity(
  product: GadgetProductState,
  rarity: Partial<GadgetRarityState>,
  productState: Partial<GadgetProductState> = {},
): GadgetProductState {
  return {
    ...product,
    ...productState,
    rarities: {
      ...product.rarities,
      common: {
        ...product.rarities.common,
        unlocked: true,
        ...rarity,
      },
    },
  };
}

function commonRarity(
  state: GameState,
  productId: keyof GameState["gadgets"]["products"],
): GadgetRarityState {
  return state.gadgets.products[productId].rarities.common;
}

function completeCurrentWork(state: GameState): GameState {
  const work = state.gadgets.activeWork!;
  const remaining = getGadgetWorkRequirement(work.productId, work.kind, work.rarity) -
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
    expect(commonRarity(firstResult, "wristband").quality).toBe(75);

    const revisionStarted = startGadgetRevision(firstResult, "wristband");
    expect(revisionStarted.school.euros).toBe(
      firstResult.school.euros - getGadgetRevisionCost("wristband"),
    );
    const revised = completeGadgetMinigame(
      startGadgetMinigame(completeCurrentWork(revisionStarted), "wristband"),
      "wristband",
      20,
    );
    expect(commonRarity(revised, "wristband").quality).toBe(75);
    expect(revised.gadgets.minigame?.score).toBe(20);
  });

  it("pauses paid development at zero productivity and resumes without losing work", () => {
    const initial = unlockedState();
    const withoutStaff = { ...initial, collaborators: [] };
    const paid = startGadgetProject(withoutStaff, "wristband");
    const paused = processGadgets(paid, 60_000, 61_000);

    expect(paused.gadgets.activeWork?.completedWorkMs).toBe(0);

    const staffed = { ...paused, collaborators: [gadgetCollaborator()] };
    expect(completeCurrentWork(staffed).gadgets.minigame?.status).toBe("ready");
  });

  it.each([
    { collaborators: 12, ordinaryIntervalMs: 5_000, marginalIntervalMs: 50_000 },
    { collaborators: 15, ordinaryIntervalMs: 4_000, marginalIntervalMs: 40_000 },
  ])(
    "turns the old 0.8-1 second cadence into $ordinaryIntervalMs ms with $collaborators collaborators",
    ({ collaborators, ordinaryIntervalMs, marginalIntervalMs }) => {
      const initial = unlockedState();
      const staffed: GameState = {
        ...initial,
        collaborators: Array.from(
          { length: collaborators },
          (_, index) => gadgetCollaborator(`gadget-collaborator-${index}`),
        ),
      };
      const product = staffed.gadgets.products.wristband;
      const selling: GameState = {
        ...staffed,
        gadgets: {
          ...staffed.gadgets,
          products: {
            ...staffed.gadgets.products,
            wristband: withCommonRarity(
              product,
              { quality: 100 },
              { projectPurchased: true, prototypeCompleted: true, accepted: true },
            ),
          },
        },
      };
      const audience = getGadgetAudience(selling);
      const marginal: GameState = {
        ...selling,
        gadgets: {
          ...selling.gadgets,
          products: {
            ...selling.gadgets.products,
            wristband: withCommonRarity(
              selling.gadgets.products.wristband,
              { unitsSold: audience },
            ),
          },
        },
      };

      expect(getGadgetMonthlyAttemptCapacity(selling)).toBeCloseTo(
        GAME_CONFIG.gameMonthMs / ordinaryIntervalMs,
      );
      expect(getGadgetMarginalMonthlyAttemptCapacity(selling)).toBeCloseTo(
        GAME_CONFIG.gameMonthMs / marginalIntervalMs,
      );
      expect(commonRarity(processGadgets(
        selling,
        ordinaryIntervalMs - 1,
        ordinaryIntervalMs,
      ), "wristband").unitsSold).toBe(0);
      expect(commonRarity(processGadgets(
        selling,
        ordinaryIntervalMs,
        ordinaryIntervalMs + 1,
      ), "wristband").unitsSold).toBe(1);
      expect(commonRarity(processGadgets(
        marginal,
        marginalIntervalMs - 1,
        marginalIntervalMs,
      ), "wristband").unitsSold).toBe(audience);
      expect(commonRarity(processGadgets(
        marginal,
        marginalIntervalMs,
        marginalIntervalMs + 1,
      ), "wristband").unitsSold).toBe(audience + 1);
    },
  );

  it("sells from the shared audience and credits the quality-based net profit", () => {
    const initial = unlockedState();
    const product = initial.gadgets.products.wristband;
    const selling: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: withCommonRarity(
            product,
            { quality: 100 },
            { projectPurchased: true, prototypeCompleted: true, accepted: true },
          ),
        },
      },
    };

    const sold = processGadgets(
      selling,
      GAME_CONFIG.gameMonthMs,
      61_000,
    );

    expect(getGadgetAudience(selling)).toBe(1_000);
    expect(commonRarity(sold, "wristband").unitsSold).toBe(1);
    expect(commonRarity(sold, "wristband").totalProfit).toBe(20);
    expect(sold.school.euros).toBe(selling.school.euros + 20);
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
          wristband: withCommonRarity(
            baseProduct,
            { quality: 0 },
            { projectPurchased: true, prototypeCompleted: true, accepted: true },
          ),
        },
      },
    };
    expect(commonRarity(
      processGadgets(zeroQuality, 60_000, 61_000),
      "wristband",
    ).unitsSold).toBe(0);

    const nearlyUnlocked: GameState = {
      ...zeroQuality,
      gadgets: {
        ...zeroQuality.gadgets,
        products: {
          ...zeroQuality.gadgets.products,
          wristband: withCommonRarity(
            zeroQuality.gadgets.products.wristband,
            {
              quality: 100,
              unitsSold: GADGET_PROJECT_UNLOCK_SALES - 1,
            },
          ),
        },
      },
    };
    const unlocked = processGadgets(
      nearlyUnlocked,
      GAME_CONFIG.gameMonthMs,
      61_000,
    );
    expect(commonRarity(unlocked, "wristband").unitsSold).toBe(100);
    expect(unlocked.gadgets.products.mug.unlocked).toBe(true);
  });

  it("continues beyond the audience through occasional marginal sales", () => {
    const initial = unlockedState();
    const audience = getGadgetAudience(initial);
    const saturated: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: withCommonRarity(
            initial.gadgets.products.wristband,
            { quality: 100, unitsSold: audience },
            { projectPurchased: true, prototypeCompleted: true, accepted: true },
          ),
        },
      },
    };

    const almostSold = processGadgets(
      saturated,
      GAME_CONFIG.gameMonthMs * 9,
      541_000,
    );
    expect(commonRarity(almostSold, "wristband").unitsSold).toBe(audience);

    const sold = processGadgets(
      almostSold,
      GAME_CONFIG.gameMonthMs,
      601_000,
    );
    expect(commonRarity(sold, "wristband").unitsSold).toBe(audience + 1);
    expect(commonRarity(sold, "wristband").totalProfit).toBe(20);
  });

  it("keeps ordinary and marginal sales active for different products", () => {
    const initial = unlockedState();
    const audience = getGadgetAudience(initial);
    const selling: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: withCommonRarity(
            initial.gadgets.products.wristband,
            { quality: 100, unitsSold: audience },
            { projectPurchased: true, prototypeCompleted: true, accepted: true },
          ),
          mug: withCommonRarity(
            initial.gadgets.products.mug,
            { quality: 100 },
            {
              unlocked: true,
              projectPurchased: true,
              prototypeCompleted: true,
              accepted: true,
            },
          ),
        },
      },
    };

    const sold = processGadgets(
      selling,
      GAME_CONFIG.gameMonthMs * 10,
      601_000,
    );

    expect(commonRarity(sold, "wristband").unitsSold).toBe(audience + 1);
    expect(commonRarity(sold, "mug").unitsSold).toBe(10);
  });

  it("returns a product to ordinary sales when its audience grows", () => {
    const initial = unlockedState();
    const audience = getGadgetAudience(initial);
    const saturated: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: withCommonRarity(
            initial.gadgets.products.wristband,
            { quality: 100, unitsSold: audience },
            { projectPurchased: true, prototypeCompleted: true, accepted: true },
          ),
        },
      },
    };
    const largerAudience = {
      ...saturated,
      school: {
        ...saturated.school,
        activeMembers: saturated.school.activeMembers + 100,
        peakActiveMembers: saturated.school.peakActiveMembers + 100,
      },
    };
    expect(commonRarity(processGadgets(
      largerAudience,
      GAME_CONFIG.gameMonthMs,
      61_000,
    ), "wristband").unitsSold).toBe(audience + 1);
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
    expect(commonRarity(accepted, "wristband").quality).toBe(0);
    expect(commonRarity(
      processGadgets(accepted, 60_000, 10_000),
      "wristband",
    ).unitsSold).toBe(0);
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
          wristband: withCommonRarity(
            initial.gadgets.products.wristband,
            { quality: 100 },
            { projectPurchased: true, prototypeCompleted: true, accepted: true },
          ),
          mug: withCommonRarity(
            initial.gadgets.products.mug,
            { quality: 100 },
            {
              unlocked: true,
              projectPurchased: true,
              prototypeCompleted: true,
              accepted: true,
            },
          ),
        },
      },
    };

    const sold = processGadgets(
      selling,
      GAME_CONFIG.gameMonthMs * 5,
      301_000,
    );
    const wristbands = commonRarity(sold, "wristband").unitsSold;
    const mugs = commonRarity(sold, "mug").unitsSold;

    expect(wristbands + mugs).toBe(12);
    expect(sold.gadgets.crossSellRemainder).toBeCloseTo(0.5);
    expect(commonRarity(sold, "wristband").totalProfit).toBe(120);
    expect(commonRarity(sold, "mug").totalProfit).toBe(180);
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
          wristband: withCommonRarity(
            initial.gadgets.products.wristband,
            { quality: 100 },
            { projectPurchased: true, prototypeCompleted: true, accepted: true },
          ),
          mug: withCommonRarity(
            initial.gadgets.products.mug,
            { quality: 100, unitsSold: audience },
            {
              unlocked: true,
              projectPurchased: true,
              prototypeCompleted: true,
              accepted: true,
            },
          ),
        },
      },
    };

    const sold = processGadgets(
      selling,
      GAME_CONFIG.gameMonthMs * 4.5,
      271_000,
    );

    expect(commonRarity(sold, "wristband").unitsSold).toBe(9);
    expect(commonRarity(sold, "mug").unitsSold).toBe(audience);
    expect(sold.gadgets.crossSellRemainder).toBeCloseTo(0.25);
  });

  it("stores a guaranteed rarity opportunity and unlocks Rare only above 50%", () => {
    const initial = unlockedState();
    const ready: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: withCommonRarity(
            initial.gadgets.products.wristband,
            { quality: 100, unitsSold: 750 },
            { projectPurchased: true, prototypeCompleted: true, accepted: true },
          ),
        },
      },
    };

    const revision = startGadgetRevision(ready, "wristband");
    expect(revision.gadgets.activeWork).toMatchObject({
      rarity: "common",
      opportunityRarity: "rare",
    });

    const result = completeGadgetMinigame(
      startGadgetMinigame(completeCurrentWork(revision), "wristband"),
      "wristband",
      51,
    );

    expect(result.gadgets.minigame?.unlockedRarity).toBe("rare");
    expect(commonRarity(result, "wristband").quality).toBe(100);
    expect(result.gadgets.products.wristband.rarities.rare).toMatchObject({
      unlocked: true,
      quality: 51,
      unitsSold: 0,
      totalProfit: 0,
    });
  });

  it("does not unlock the offered rarity at exactly 50%", () => {
    const initial = unlockedState();
    const ready: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: withCommonRarity(
            initial.gadgets.products.wristband,
            { quality: 75, unitsSold: 830 },
            { projectPurchased: true, prototypeCompleted: true, accepted: true },
          ),
        },
      },
    };

    const result = completeGadgetMinigame(
      startGadgetMinigame(
        completeCurrentWork(startGadgetRevision(ready, "wristband")),
        "wristband",
      ),
      "wristband",
      50,
    );

    expect(result.gadgets.minigame?.opportunityRarity).toBe("rare");
    expect(result.gadgets.minigame?.unlockedRarity).toBeUndefined();
    expect(result.gadgets.products.wristband.rarities.rare.unlocked).toBe(false);
    expect(commonRarity(result, "wristband").quality).toBe(75);
  });

  it("shares sales capacity across rarity variants and applies their value multiplier", () => {
    const initial = unlockedState();
    const product = withCommonRarity(
      initial.gadgets.products.wristband,
      { quality: 100 },
      { projectPurchased: true, prototypeCompleted: true, accepted: true },
    );
    const selling: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...product,
            rarities: {
              ...product.rarities,
              rare: { ...product.rarities.rare, unlocked: true, quality: 100 },
            },
          },
        },
      },
    };

    const sold = processGadgets(
      selling,
      GAME_CONFIG.gameMonthMs * 2,
      121_000,
    );

    expect(commonRarity(sold, "wristband")).toMatchObject({
      unitsSold: 1,
      totalProfit: 20,
    });
    expect(sold.gadgets.products.wristband.rarities.rare).toMatchObject({
      unitsSold: 1,
      totalProfit: 25,
    });
    expect(sold.school.euros).toBe(selling.school.euros + 45);
  });

  it("unlocks the next Gadget from total family sales across rarities", () => {
    const initial = unlockedState();
    const product = withCommonRarity(
      initial.gadgets.products.wristband,
      { quality: 100, unitsSold: 60 },
      { projectPurchased: true, prototypeCompleted: true, accepted: true },
    );
    const selling: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...product,
            rarities: {
              ...product.rarities,
              rare: {
                ...product.rarities.rare,
                unlocked: true,
                quality: 100,
                unitsSold: 39,
              },
            },
          },
        },
      },
    };

    const sold = processGadgets(
      selling,
      GAME_CONFIG.gameMonthMs * 2,
      121_000,
    );

    expect(
      commonRarity(sold, "wristband").unitsSold +
        sold.gadgets.products.wristband.rarities.rare.unitsSold,
    ).toBeGreaterThanOrEqual(GADGET_PROJECT_UNLOCK_SALES);
    expect(sold.gadgets.products.mug.unlocked).toBe(true);
  });
});
