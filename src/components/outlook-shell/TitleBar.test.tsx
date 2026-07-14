import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitleBar } from "./TitleBar";

describe("TitleBar", () => {
  it("shows the month, game year, and progress toward the next month", () => {
    const { rerender } = render(
      <TitleBar currentMonth={1} nextMonthAt={121_000} now={61_000} />,
    );

    expect(screen.getByLabelText("Mese corrente: Gennaio, anno 1")).toHaveTextContent("Gennaio");
    expect(screen.getByRole("progressbar", { name: "Avanzamento di Gennaio" }))
      .toHaveAttribute("aria-valuenow", "50");

    rerender(<TitleBar currentMonth={12} nextMonthAt={121_000} now={1_000} />);
    expect(screen.getByLabelText("Mese corrente: Dicembre, anno 1")).toBeVisible();

    rerender(<TitleBar currentMonth={13} nextMonthAt={121_000} now={1_000} />);
    expect(screen.getByLabelText("Mese corrente: Gennaio, anno 2")).toBeVisible();
  });
});
