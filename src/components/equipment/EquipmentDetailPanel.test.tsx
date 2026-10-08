import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInitialState } from "../../game/engine";
import type { Collaborator } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { EquipmentDetailPanel } from "./EquipmentDetailPanel";

function renderedCurrency(value: number): string {
  return formatCurrency(value).replace(/\s/g, " ");
}

afterEach(cleanup);

describe("EquipmentDetailPanel", () => {
  it("shows the swords, repairs from the hilt and lists every state", () => {
    const initial = createInitialState(1_000);
    const onMaintainEquipment = vi.fn();

    const { container } = render(
      <EquipmentDetailPanel
        state={{
          ...initial,
          school: { ...initial.school, euros: 100 },
          equipment: { ...initial.equipment, availableSwords: 5, wear: 45 },
        }}
        onMaintainEquipment={onMaintainEquipment}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    expect(container.querySelector(".equipment-quick-total")).toHaveTextContent("5libere su 6");
    expect(screen.getByText("45 pt di usura")).toBeVisible();
    expect(container.querySelector(".school-saber.is-large")).toBeInTheDocument();
    expect(container.querySelector(".equipment-legend")).toHaveTextContent(
      "Libere 5In uso 1Rotte 0Usura 45 pt",
    );

    expect(screen.getByText("Premi l'elsa per riparare le spade")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Ripara tutto/ }));
    expect(onMaintainEquipment).toHaveBeenCalledOnce();
  });

  it("points to the Upgrades until Fornitore ufficiale is bought", () => {
    const initial = createInitialState(1_000);
    const { rerender } = render(
      <EquipmentDetailPanel
        state={{ ...initial, school: { ...initial.school, euros: 10_000, peakActiveMembers: 500 } }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: /da sbloccare negli Upgrade/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Acquista 1 spada/ })).not.toBeInTheDocument();

    rerender(
      <EquipmentDetailPanel
        state={{ ...initial, upgrades: { ...initial.upgrades, "official-supplier": 1 } }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={() => undefined}
      />,
    );
    expect(screen.queryByRole("button", { name: /da sbloccare negli Upgrade/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Acquista 1 spada/ })).toBeInTheDocument();
  });

  it("says when no sword is free", () => {
    const initial = createInitialState(1_000);
    render(
      <EquipmentDetailPanel
        state={{ ...initial, equipment: { ...initial.equipment, availableSwords: 0 } }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    expect(screen.getByText(/Nessuna spada libera/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Spade in ordine" })).toHaveAttribute("aria-disabled", "true");
  });

  it("reserves the automatic repair progress space while there is no repair work", () => {
    const initial = createInitialState(1_000);
    const equipmentCollaborator: Collaborator = {
      id: "equipment-quick-panel-collaborator",
      contactId: initial.contacts[0].id,
      displayName: "Collaboratore Attrezzatura",
      joinedAt: 1_000,
      forms: [],
      instructorForms: [],
      formBranchPreferences: [],
      assignment: "equipment",
      mastery: { writing: 0, events: 0, equipment: 0, instructor: 0 },
      rarity: "ultra-rare",
    };
    const idleState = {
      ...initial,
      school: { ...initial.school, euros: 100 },
      collaborators: [equipmentCollaborator],
    };
    const { container, rerender } = render(
      <EquipmentDetailPanel
        state={idleState}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    const progressSlot = container.querySelector(".equipment-auto-progress-slot");
    expect(progressSlot).toBeInTheDocument();
    expect(
      screen.queryByRole("progressbar", { name: "Riduzione automatica dell'usura" }),
    ).not.toBeInTheDocument();

    rerender(
      <EquipmentDetailPanel
        state={{
          ...idleState,
          equipment: { ...idleState.equipment, wear: 10 },
        }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    expect(container.querySelector(".equipment-auto-progress-slot")).toBe(progressSlot);
    expect(
      screen.getByRole("progressbar", { name: "Riduzione automatica dell'usura" }),
    ).toBeVisible();
  });

  it("offers x10 only when the school can afford ten swords", () => {
    const initial = createInitialState(1_000);
    const onBuyOfficialSwords = vi.fn();

    render(
      <EquipmentDetailPanel
        state={{
          ...initial,
          upgrades: { ...initial.upgrades, "official-supplier": 1 },
          school: {
            ...initial.school,
            euros: 3_300,
          },
        }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={onBuyOfficialSwords}
      />,
    );

    const quantityButton = screen.getByRole("button", {
      name: /Quantit. acquisto: .1/,
    });
    expect(quantityButton).toHaveAttribute("title", expect.stringContaining("10"));
    expect(quantityButton).not.toHaveAttribute("title", expect.stringContaining("100"));

    fireEvent.click(quantityButton);
    expect(screen.getByRole("button", { name: /Quantit. acquisto: .10/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Acquista 10 spade/ }));

    expect(onBuyOfficialSwords).toHaveBeenCalledWith(10);
  });

  it("adds x100 to the cycle only when one hundred swords are affordable", () => {
    const initial = createInitialState(1_000);

    render(
      <EquipmentDetailPanel
        state={{
          ...initial,
          upgrades: { ...initial.upgrades, "official-supplier": 1 },
          school: {
            ...initial.school,
            euros: 33_000,
          },
        }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    const quantityButton = screen.getByRole("button", {
      name: /Quantit. acquisto: .1/,
    });
    fireEvent.click(quantityButton);
    fireEvent.click(quantityButton);

    expect(screen.getByRole("button", { name: /Quantit. acquisto: .100/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Acquista 100 spade/ })).toBeEnabled();
  });

  it("uses compounded light inflation for every purchase quantity and displayed cost", () => {
    const initial = createInitialState(1_000);
    const onBuyOfficialSwords = vi.fn();

    render(
      <EquipmentDetailPanel
        state={{
          ...initial,
          upgrades: { ...initial.upgrades, "official-supplier": 1 },
          school: { ...initial.school, euros: 40_000 },
          lightInflation: { ...initial.lightInflation, priceMultiplier: 1.1 * 1.1 },
        }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={onBuyOfficialSwords}
      />,
    );

    const quantityButton = screen.getByRole("button", { name: /Quantit. acquisto: .1/ });
    expect(screen.getByRole("button", { name: /Acquista 1 spada/ })).toHaveTextContent(
      renderedCurrency(330 * 1.1 * 1.1),
    );

    fireEvent.click(quantityButton);
    expect(screen.getByRole("button", { name: /Acquista 10 spade/ })).toHaveTextContent(
      renderedCurrency(330 * 1.1 * 1.1 * 10),
    );
    fireEvent.click(screen.getByRole("button", { name: /Acquista 10 spade/ }));

    fireEvent.click(quantityButton);
    expect(screen.getByRole("button", { name: /Acquista 100 spade/ })).toHaveTextContent(
      renderedCurrency(330 * 1.1 * 1.1 * 100),
    );
    fireEvent.click(screen.getByRole("button", { name: /Acquista 100 spade/ }));

    expect(onBuyOfficialSwords).toHaveBeenNthCalledWith(1, 10);
    expect(onBuyOfficialSwords).toHaveBeenNthCalledWith(2, 100);
  });

  it("keeps unavailable multipliers hidden when funds are insufficient", () => {
    const initial = createInitialState(1_000);

    render(
      <EquipmentDetailPanel
        state={{
          ...initial,
          upgrades: { ...initial.upgrades, "official-supplier": 1 },
          school: {
            ...initial.school,
            euros: 329,
          },
        }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    const quantityButton = screen.getByRole("button", {
      name: /Quantit. acquisto: .1/,
    });
    expect(quantityButton).toBeDisabled();
    expect(quantityButton.getAttribute("title")).toMatch(/1$/);
    expect(screen.getByRole("button", { name: /Acquista 1 spada/ })).toBeDisabled();
  });

  it.each([
    { amount: 1, euros: 363 },
    { amount: 10, euros: 3_630 },
    { amount: 100, euros: 36_300 },
  ])("allows the exact inflated balance of %s sword(s)", ({ amount, euros }) => {
    const initial = createInitialState(1_000);
    const onBuyOfficialSwords = vi.fn();

    render(
      <EquipmentDetailPanel
        state={{
          ...initial,
          upgrades: { ...initial.upgrades, "official-supplier": 1 },
          school: { ...initial.school, euros },
          lightInflation: { ...initial.lightInflation, priceMultiplier: 1.1 },
        }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={onBuyOfficialSwords}
      />,
    );

    const quantityButton = screen.getByRole("button", { name: /Quantit. acquisto: .1/ });
    expect(screen.getByRole("button", { name: /Acquista 1 spada/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Acquista 1 spada/ }))
      .toHaveAttribute("title", expect.stringMatching(/^Polaris EVO Basic, 363,00/));

    if (amount === 1) {
      expect(quantityButton).toBeDisabled();
      expect(quantityButton).toHaveAttribute("title", expect.stringMatching(/×1$/));
    } else {
      expect(quantityButton).toBeEnabled();
      expect(quantityButton).toHaveAttribute("title", expect.stringContaining(`×${amount}`));
      for (let index = 0; index < Math.log10(amount); index += 1) {
        fireEvent.click(quantityButton);
      }
    }

    const purchaseButton = screen.getByRole("button", {
      name: amount === 1 ? /Acquista 1 spada/ : new RegExp(`Acquista ${amount} spade`),
    });
    expect(purchaseButton).toBeEnabled();
    expect(purchaseButton).toHaveTextContent(renderedCurrency(363 * amount));
    fireEvent.click(purchaseButton);

    expect(onBuyOfficialSwords).toHaveBeenCalledWith(amount);
  });
});
