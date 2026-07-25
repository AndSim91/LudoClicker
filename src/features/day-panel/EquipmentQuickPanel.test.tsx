import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInitialState } from "../../game/engine";
import { EquipmentQuickPanel } from "./EquipmentQuickPanel";

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
    expect(container.querySelector(".equipment-condition.is-battery")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ripara tutto/ }));
    expect(onMaintainEquipment).toHaveBeenCalledOnce();
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
});
