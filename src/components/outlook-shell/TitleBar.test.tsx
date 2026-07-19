import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GAME_CONFIG } from "../../game/config";
import { TitleBar } from "./TitleBar";
import { formatCompactCurrency, formatExactCurrency } from "./resourceFormatting";

describe("TitleBar", () => {
  it("shows the month, school year, and progress toward the next month", () => {
    const { rerender } = render(
      <TitleBar
        currentMonth={9}
        nextMonthAt={1_000 + GAME_CONFIG.gameMonthMs}
        now={1_000 + GAME_CONFIG.gameMonthMs / 2}
        contactsAwaitingEmail={4}
        activeMembers={3}
        euros={120}
      />,
    );

    expect(screen.getByLabelText("Situazione del gioco")).toHaveTextContent(
      formatCompactCurrency(120).replace(/\u00a0/g, " "),
    );
    expect(screen.getByText("Iscritti attivi")).toBeVisible();
    expect(screen.getByLabelText("Mese corrente: Settembre, anno scolastico 1"))
      .toHaveTextContent("SettembreAnno scolastico 1");
    expect(screen.getByRole("progressbar", {
      name: "Avanzamento di Settembre, anno scolastico 1",
    }))
      .toHaveAttribute("aria-valuenow", "50");

    rerender(
      <TitleBar
        currentMonth={20}
        nextMonthAt={1_000 + GAME_CONFIG.gameMonthMs}
        now={1_000}
        contactsAwaitingEmail={0}
        activeMembers={0}
        euros={0}
      />,
    );
    expect(screen.getByLabelText("Mese corrente: Agosto, anno scolastico 1")).toBeVisible();

    rerender(
      <TitleBar
        currentMonth={21}
        nextMonthAt={1_000 + GAME_CONFIG.gameMonthMs}
        now={1_000}
        contactsAwaitingEmail={0}
        activeMembers={0}
        euros={0}
      />,
    );
    expect(screen.getByLabelText("Mese corrente: Settembre, anno scolastico 2"))
      .toHaveTextContent("SettembreAnno scolastico 2");
  });

  it("compacts large resources without losing the exact accessible value", () => {
    const euros = 99_999_999_088;
    const { container } = render(
      <TitleBar
        currentMonth={9}
        nextMonthAt={1_000 + GAME_CONFIG.gameMonthMs}
        now={1_000 + GAME_CONFIG.gameMonthMs / 2}
        contactsAwaitingEmail={1_200_000}
        activeMembers={999_999}
        euros={euros}
      />,
    );

    expect(container.querySelector(".title-resources")).toHaveTextContent(
      formatCompactCurrency(euros).replace(/\u00a0/g, " "),
    );
    expect(container.querySelectorAll(".title-resource")[2]).toHaveAttribute(
      "aria-label",
      expect.stringContaining(formatExactCurrency(euros)),
    );
    expect(container.querySelector(`strong[title="${formatExactCurrency(euros)}"]`)).toHaveTextContent(
      formatCompactCurrency(euros).replace(/\u00a0/g, " "),
    );
  });
});
