import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/initialState";
import type { GameState } from "../../game/types";
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

describe("GadgetsView", () => {
  it("shows the compact catalog information and starts the paid Polsino project", () => {
    const actions = handlers();
    render(<GadgetsView state={unlockedState()} {...actions} />);

    expect(screen.getByText("200")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Polsino" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Tazza" })).toBeVisible();
    expect(screen.getByText(/Si sblocca dopo 100 vendite di Polsino/)).toBeVisible();
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
          wristband: {
            ...initial.gadgets.products.wristband,
            projectPurchased: true,
            prototypeCompleted: true,
            accepted: true,
            quality: 75,
            unitsSold: 123,
            totalProfit: 1_845,
          },
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
          seed: 123,
          previousQuality: 75,
          status: "result",
          score: 20,
        },
        products: {
          ...initial.gadgets.products,
          wristband: {
            ...initial.gadgets.products.wristband,
            projectPurchased: true,
            prototypeCompleted: true,
            quality: 75,
          },
        },
      },
    };

    render(<GadgetsView state={result} {...handlers()} />);

    expect(screen.getByRole("dialog", { name: /Polsino/ })).toBeVisible();
    expect(screen.getByText("20%")).toBeVisible();
    expect(screen.getByText("La qualità massima resta al 75%.")).toBeVisible();
  });
});
