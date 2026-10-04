import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatShortCurrency } from "../../shared/formatters";
import { SchoolSaber } from "./SchoolSaber";

afterEach(cleanup);

const equipment = (overrides: Partial<{ totalSwords: number; availableSwords: number; damagedSwords: number; wear: number }>) => ({
  totalSwords: 31,
  availableSwords: 14,
  damagedSwords: 1,
  wear: 89,
  ...overrides,
});

describe("SchoolSaber", () => {
  it.each([
    { name: "nothing to repair", eq: { damagedSwords: 0, wear: 0, availableSwords: 15 }, euros: 1_000, kind: "none", price: "", label: "Spade in ordine" },
    { name: "full repair", eq: {}, euros: 12_480, kind: "full", price: "428 €", label: /^Ripara tutto/ },
    { name: "partial repair", eq: {}, euros: 300, kind: "partial", price: "300 €", label: /^Riparazione parziale/ },
    { name: "missing funds", eq: {}, euros: 180, kind: "short", price: "250 €", label: /^Servono almeno/ },
    { name: "wear only on swords in use", eq: { damagedSwords: 0, availableSwords: 0 }, euros: 1_000, kind: "blocked", price: "", label: /^Riparazione non disponibile/ },
  ])("colours the ring and prices the hilt: $name", ({ eq, euros, kind, price, label }) => {
    const onRepair = vi.fn();
    const { container } = render(<SchoolSaber equipment={equipment(eq)} euros={euros} onRepair={onRepair} />);

    expect(container.querySelector(".school-saber")).toHaveClass(`repair-${kind}`);
    const hilt = screen.getByRole("button", { name: label });
    expect(hilt).toHaveTextContent(price);
    fireEvent.click(hilt);
    expect(onRepair).toHaveBeenCalledTimes(kind === "full" || kind === "partial" ? 1 : 0);
  });

  it("keeps the hilt the same element when the repair is done", () => {
    const { rerender } = render(<SchoolSaber equipment={equipment({})} euros={12_480} onRepair={() => undefined} />);
    const hilt = screen.getByRole("button", { name: /^Ripara tutto/ });
    rerender(<SchoolSaber equipment={equipment({ damagedSwords: 0, wear: 0, availableSwords: 15 })} euros={12_052} onRepair={() => undefined} />);
    expect(screen.getByRole("button", { name: "Spade in ordine" })).toBe(hilt);
  });

  it("orders the blade from the hilt: free, worn, in use, broken", () => {
    const { container } = render(<SchoolSaber equipment={equipment({})} euros={0} onRepair={() => undefined} />);
    const bands = [...container.querySelectorAll(".school-saber-blade > span")];
    expect(bands.map((band) => band.className)).toEqual(["is-healthy", "is-wear", "is-in-use", "is-broken"]);
    const width = (index: number) => Number.parseFloat((bands[index] as HTMLElement).style.width);
    expect(width(0) + width(1)).toBeCloseTo((14 / 31) * 100);
    expect(width(1)).toBeCloseTo(4);
    expect(width(2)).toBeCloseTo((16 / 31) * 100);
    expect(width(3)).toBeCloseTo((1 / 31) * 100);
  });

  it("shortens large prices to fit the grip", () => {
    expect(formatShortCurrency(428)).toBe("428 €");
    expect(formatShortCurrency(1_250)).toBe("1,3k €");
    expect(formatShortCurrency(125_000)).toBe("125k €");
    expect(formatShortCurrency(3_400_000)).toBe("3,4M €");
  });
});
