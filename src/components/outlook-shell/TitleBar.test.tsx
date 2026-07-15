import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitleBar } from "./TitleBar";

describe("TitleBar", () => {
  it("shows the month, school year, and progress toward the next month", () => {
    const { rerender } = render(
      <TitleBar currentMonth={1} nextMonthAt={121_000} now={61_000} />,
    );

    expect(screen.getByLabelText("Mese corrente: Gennaio, anno scolastico 1"))
      .toHaveTextContent("GennaioAnno scolastico 1");
    expect(screen.getByRole("progressbar", {
      name: "Avanzamento di Gennaio, anno scolastico 1",
    }))
      .toHaveAttribute("aria-valuenow", "50");

    rerender(<TitleBar currentMonth={8} nextMonthAt={121_000} now={1_000} />);
    expect(screen.getByLabelText("Mese corrente: Agosto, anno scolastico 1")).toBeVisible();

    rerender(<TitleBar currentMonth={9} nextMonthAt={121_000} now={1_000} />);
    expect(screen.getByLabelText("Mese corrente: Settembre, anno scolastico 2"))
      .toHaveTextContent("SettembreAnno scolastico 2");
  });
});
