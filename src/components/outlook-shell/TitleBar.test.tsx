import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitleBar } from "./TitleBar";

describe("TitleBar", () => {
  it("shows the current month name and repeats the cycle without years", () => {
    const { rerender } = render(<TitleBar currentMonth={1} />);

    expect(screen.getByLabelText("Mese corrente: Gennaio")).toHaveTextContent("Gennaio");

    rerender(<TitleBar currentMonth={12} />);
    expect(screen.getByLabelText("Mese corrente: Dicembre")).toBeVisible();

    rerender(<TitleBar currentMonth={13} />);
    expect(screen.getByLabelText("Mese corrente: Gennaio")).toBeVisible();
  });
});
