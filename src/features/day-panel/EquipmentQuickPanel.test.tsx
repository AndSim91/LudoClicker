import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInitialState } from "../../game/engine";
import type { Collaborator } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { EquipmentQuickPanel } from "./EquipmentQuickPanel";

function renderedCurrency(value: number): string {
  return formatCurrency(value).replace(/\s/g, " ");
}

afterEach(cleanup);

describe("EquipmentQuickPanel", () => {
  it("shows condition and moves manual maintenance into La mia giornata", () => {
    const initial = createInitialState(1_000);
    const onMaintainEquipment = vi.fn();

    const { container } = render(
      <EquipmentQuickPanel
        state={{
          ...initial,
          school: { ...initial.school, euros: 100 },
          equipment: { ...initial.equipment, availableSwords: 5, wear: 45 },
        }}
        onMaintainEquipment={onMaintainEquipment}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    expect(screen.getByText("5/6 spade libere")).toBeVisible();
    expect(screen.getByText("45 pt usura")).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "Condizione delle spade della scuola" }),
    ).toHaveClass("equipment-condition-bar", "is-aggregate");
    expect(container.querySelector(".equipment-condition.is-saber")).toBeInTheDocument();
    expect(container.querySelector(".equipment-saber-outline")).toBeInTheDocument();

    const repairButton = screen.getByRole("button", { name: /Ripara tutto/ });
    expect(repairButton.parentElement).toHaveClass(
      "equipment-quick-metrics",
      "has-maintenance-action",
    );
    fireEvent.click(repairButton);
    expect(onMaintainEquipment).toHaveBeenCalledOnce();
  });

  it("keeps the repair action mounted and disabled when maintenance is not needed", () => {
    const initial = createInitialState(1_000);
    const fundedState = {
      ...initial,
      school: { ...initial.school, euros: 100 },
    };
    const onMaintainEquipment = vi.fn();
    const { container, rerender } = render(
      <EquipmentQuickPanel
        state={fundedState}
        onMaintainEquipment={onMaintainEquipment}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    const idleRepairButton = screen.getByRole("button", {
      name: "Nessuna riparazione necessaria",
    });
    expect(idleRepairButton).toBeDisabled();
    expect(idleRepairButton).toHaveTextContent("Ripara");
    expect(idleRepairButton).toHaveTextContent("In ordine");
    expect(container.querySelector(".equipment-quick-metrics")).toHaveClass(
      "has-maintenance-action",
    );

    fireEvent.click(idleRepairButton);
    expect(onMaintainEquipment).not.toHaveBeenCalled();

    rerender(
      <EquipmentQuickPanel
        state={{
          ...fundedState,
          equipment: { ...initial.equipment, wear: 10 },
        }}
        onMaintainEquipment={onMaintainEquipment}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    const activeRepairButton = screen.getByRole("button", { name: /Ripara tutto/ });
    expect(activeRepairButton).toBe(idleRepairButton);
    expect(activeRepairButton).toBeEnabled();

    rerender(
      <EquipmentQuickPanel
        state={fundedState}
        onMaintainEquipment={onMaintainEquipment}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Nessuna riparazione necessaria" }),
    ).toBe(idleRepairButton);
    expect(idleRepairButton).toBeDisabled();
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
      <EquipmentQuickPanel
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
      <EquipmentQuickPanel
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
      <EquipmentQuickPanel
        state={{
          ...initial,
          school: {
            ...initial.school,
            euros: 3_300,
            peakActiveMembers: 15,
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
      <EquipmentQuickPanel
        state={{
          ...initial,
          school: {
            ...initial.school,
            euros: 33_000,
            peakActiveMembers: 15,
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
      <EquipmentQuickPanel
        state={{
          ...initial,
          school: { ...initial.school, euros: 40_000, peakActiveMembers: 15 },
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
      <EquipmentQuickPanel
        state={{
          ...initial,
          school: {
            ...initial.school,
            euros: 329,
            peakActiveMembers: 15,
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
      <EquipmentQuickPanel
        state={{
          ...initial,
          school: { ...initial.school, euros, peakActiveMembers: 15 },
          lightInflation: { ...initial.lightInflation, priceMultiplier: 1.1 },
        }}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={onBuyOfficialSwords}
      />,
    );

    const quantityButton = screen.getByRole("button", { name: /Quantit. acquisto: .1/ });
    expect(screen.getByRole("button", { name: /Acquista 1 spada/ })).toBeEnabled();
    expect(screen.getByText(/Polaris EVO Basic - 363,00/)).toBeVisible();

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
