import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GAME_CONFIG } from "../../game/config";
import { TitleBar } from "./TitleBar";
import {
  formatCompactCurrency,
  formatCompactNumber,
  formatExactCurrency,
  formatExactNumber,
} from "./resourceFormatting";

afterEach(cleanup);

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
        isPaused={false}
        onTogglePause={() => undefined}
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
        isPaused={false}
        onTogglePause={() => undefined}
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
        isPaused={false}
        onTogglePause={() => undefined}
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
        isPaused={false}
        onTogglePause={() => undefined}
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

  it("shows Follower only after Social is available", () => {
    const { rerender } = render(
      <TitleBar
        currentMonth={9}
        nextMonthAt={61_000}
        now={1_000}
        contactsAwaitingEmail={0}
        activeMembers={0}
        followers={1_250}
        euros={0}
        isPaused={false}
        onTogglePause={() => undefined}
      />,
    );

    expect(screen.getByLabelText(`Follower Social: ${formatExactNumber(1_250)}`))
      .toHaveTextContent(`Follower${formatCompactNumber(1_250)}`);

    rerender(
      <TitleBar
        currentMonth={9}
        nextMonthAt={61_000}
        now={1_000}
        contactsAwaitingEmail={0}
        activeMembers={0}
        euros={0}
        isPaused={false}
        onTogglePause={() => undefined}
      />,
    );
    expect(screen.queryByText("Follower")).not.toBeInTheDocument();
  });

  it("toggles the pause control between pause and resume", () => {
    const onTogglePause = vi.fn();
    const { rerender } = render(
      <TitleBar
        currentMonth={9}
        nextMonthAt={1_000 + GAME_CONFIG.gameMonthMs}
        now={1_000}
        contactsAwaitingEmail={0}
        activeMembers={0}
        euros={0}
        isPaused={false}
        onTogglePause={onTogglePause}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pausa" }));
    expect(onTogglePause).toHaveBeenCalledOnce();

    rerender(
      <TitleBar
        currentMonth={9}
        nextMonthAt={1_000 + GAME_CONFIG.gameMonthMs}
        now={1_000}
        contactsAwaitingEmail={0}
        activeMembers={0}
        euros={0}
        isPaused
        onTogglePause={onTogglePause}
      />,
    );
    expect(screen.getByRole("button", { name: "Riprendi" }))
      .toHaveAttribute("aria-pressed", "true");
  });
});
