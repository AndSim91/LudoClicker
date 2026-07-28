import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/initialState";
import type {
  GadgetProductState,
  GadgetRarityState,
  GameState,
} from "../../game/types";
import { GadgetsView } from "./GadgetsView";

afterEach(cleanup);

const handlers = () => ({
  onStartProject: vi.fn(),
  onStartRevision: vi.fn(),
  onStartMinigame: vi.fn(),
  onCompleteMinigame: vi.fn(),
  onDismissMinigameResult: vi.fn(),
  onAccept: vi.fn(),
});

function unlockedState(): GameState {
  const initial = createInitialState(1_000, "Manager");
  return {
    ...initial,
    school: {
      ...initial.school,
      activeMembers: 2_000,
      peakActiveMembers: 2_000,
      euros: 50_000,
    },
    unlocks: { ...initial.unlocks, gadget: true },
    gadgets: {
      ...initial.gadgets,
      products: {
        ...initial.gadgets.products,
        wristband: { ...initial.gadgets.products.wristband, unlocked: true },
      },
    },
  };
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

describe("GadgetsView", () => {
  it("shows the compact catalog information and starts the paid Polsino project", () => {
    const actions = handlers();
    render(<GadgetsView state={unlockedState()} {...actions} />);

    expect(screen.getByText("200")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Polsino" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Tazza" })).toBeVisible();
    expect(screen.getByText(/Si sblocca dopo 100 vendite di Polsino/)).toBeVisible();
    expect(screen.getByText(/vendite occasionali, ma molto più lente/)).toBeVisible();
    expect(screen.queryByText(/recupero|margine|proiezione/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Avvia progetto/ }));
    expect(actions.onStartProject).toHaveBeenCalledWith("wristband");
  });

  it("shows only sold units and earned profit for an accepted product", () => {
    const initial = unlockedState();
    const selling: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: withCommonRarity(
            initial.gadgets.products.wristband,
            { quality: 75, unitsSold: 123, totalProfit: 1_845 },
            { projectPurchased: true, prototypeCompleted: true, accepted: true },
          ),
        },
      },
    };

    render(<GadgetsView state={selling} {...handlers()} />);

    expect(screen.getByText("Venduti")).toBeVisible();
    expect(screen.getByText("123")).toBeVisible();
    expect(screen.getByText("Guadagnato")).toBeVisible();
    expect(screen.getByText(/1845,00/)).toBeVisible();
    expect(screen.getByText("75%")).toBeVisible();
  });

  it("keeps the best quality after a worse revision result", () => {
    const initial = unlockedState();
    const result: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        minigame: {
          productId: "wristband",
          kind: "revision",
          rarity: "common",
          seed: 123,
          previousQuality: 75,
          status: "result",
          score: 20,
        },
        products: {
          ...initial.gadgets.products,
          wristband: withCommonRarity(
            initial.gadgets.products.wristband,
            { quality: 75 },
            { projectPurchased: true, prototypeCompleted: true },
          ),
        },
      },
    };

    render(<GadgetsView state={result} {...handlers()} />);

    expect(screen.getByRole("dialog", { name: /Polsino/ })).toBeVisible();
    expect(screen.getByText("20%")).toBeVisible();
    expect(screen.getByText("La qualità massima resta al 75%.")).toBeVisible();
  });

  it("shows one row per unlocked rarity and improves only the highest one", () => {
    const initial = unlockedState();
    const common = withCommonRarity(
      initial.gadgets.products.wristband,
      { quality: 100, unitsSold: 180, totalProfit: 3_600 },
      { projectPurchased: true, prototypeCompleted: true, accepted: true },
    );
    const selling: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...common,
            rarities: {
              ...common.rarities,
              rare: {
                ...common.rarities.rare,
                unlocked: true,
                quality: 64,
                unitsSold: 30,
                totalProfit: 480,
              },
            },
          },
        },
      },
    };

    render(<GadgetsView state={selling} {...handlers()} />);

    expect(screen.getByText("Comune")).toBeVisible();
    expect(screen.getByText("Raro")).toBeVisible();
    expect(screen.getByText("64%")).toBeVisible();
    expect(screen.getByRole("button", { name: /Migliora qualità.*1250,00/ })).toBeVisible();
    expect(document.querySelector(".gadget-product-card.rarity-rare")).toBeTruthy();
    expect(screen.queryByText(/probabilità/i)).not.toBeInTheDocument();
  });

  it("announces the offered rarity in the rhythm game without showing its chance", () => {
    const initial = unlockedState();
    const product = withCommonRarity(
      initial.gadgets.products.wristband,
      { quality: 80, unitsSold: 200 },
      { projectPurchased: true, prototypeCompleted: true, accepted: true },
    );
    const running: GameState = {
      ...initial,
      gadgets: {
        ...initial.gadgets,
        products: { ...initial.gadgets.products, wristband: product },
        minigame: {
          productId: "wristband",
          kind: "revision",
          rarity: "common",
          opportunityRarity: "rare",
          seed: 123,
          previousQuality: 80,
          status: "running",
        },
      },
    };

    render(<GadgetsView state={running} {...handlers()} />);

    expect(screen.getByText("Occasione: Raro")).toBeVisible();
    expect(screen.getByRole("dialog", { name: "Polsino" })).toHaveClass("rarity-rare");
    expect(screen.queryByText(/probabilità/i)).not.toBeInTheDocument();
  });
});
