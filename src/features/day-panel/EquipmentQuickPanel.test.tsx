import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInitialState } from "../../game/engine";
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

  it("hides the repair action completely when no maintenance is needed", () => {
    const initial = createInitialState(1_000);
    const { container } = render(
      <EquipmentQuickPanel
        state={initial}
        onMaintainEquipment={() => undefined}
        onBuyOfficialSwords={() => undefined}
      />,
    );

    expect(screen.queryByRole("button", { name: /Ripara|Manutenzione/ })).not.toBeInTheDocument();
    expect(container.querySelector(".equipment-quick-metrics")).not.toHaveClass(
      "has-maintenance-action",
    );
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
