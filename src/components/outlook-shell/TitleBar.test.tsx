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
const equipment = {
  totalSwords: 6,
  availableSwords: 6,
  damagedSwords: 0,
  wear: 0,
};

afterEach(cleanup);

describe("TitleBar", () => {
  it("shows the month, school year, and progress toward the next month", () => {
    const { container, rerender } = render(
      <TitleBar
        currentMonth={9}
        nextMonthAt={1_000 + GAME_CONFIG.gameMonthMs}
        now={1_000 + GAME_CONFIG.gameMonthMs / 2}
        contactsAwaitingEmail={4}
        activeMembers={3}
        fame={7}
        euros={120}
        equipment={equipment}
        isPaused={false}
        onTogglePause={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Situazione del gioco")).toHaveTextContent(
      formatCompactCurrency(120).replace(/\u00a0/g, " "),
    );
    expect(screen.getByText("Iscritti attivi")).toBeVisible();
    const fame = screen.getByLabelText("Fama della scuola: 7");
    const equipmentIndicator = screen.getByLabelText(
      "Spade disponibili: 6 su 6; 0 rotte; 0 punti di usura",
    );
    const pause = screen.getByRole("button", { name: "Pausa" });
    expect(fame).toHaveTextContent("Fama della scuola7");
    expect(equipmentIndicator).toHaveTextContent("Spade6/6");
    expect(equipmentIndicator.querySelector(".equipment-condition.is-cylinder")).toBeInTheDocument();
    expect(equipmentIndicator.querySelector(".equipment-saber-outline")).not.toBeInTheDocument();
    expect(equipmentIndicator.nextElementSibling).toBe(fame);
    expect(fame.nextElementSibling).toBe(pause);
    expect(pause.nextElementSibling).toBe(container.querySelector(".title-month"));
    expect(screen.getByLabelText("Mese corrente: Settembre, anno scolastico 1")).toHaveTextContent(
      "SettembreAnno scolastico 1",
    );
    expect(
      screen.getByRole("progressbar", {
        name: "Avanzamento di Settembre, anno scolastico 1",
      }),
    ).toHaveAttribute("aria-valuenow", "50");

    rerender(
      <TitleBar
        currentMonth={20}
        nextMonthAt={1_000 + GAME_CONFIG.gameMonthMs}
        now={1_000}
        contactsAwaitingEmail={0}
        activeMembers={0}
        fame={7}
        euros={0}
        equipment={equipment}
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
        fame={7}
        euros={0}
        equipment={equipment}
        isPaused={false}
        onTogglePause={() => undefined}
      />,
    );
    expect(screen.getByLabelText("Mese corrente: Settembre, anno scolastico 2")).toHaveTextContent(
      "SettembreAnno scolastico 2",
    );
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
        fame={1_250_000}
        euros={euros}
        equipment={equipment}
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
    expect(
      container.querySelector(`strong[title="${formatExactCurrency(euros)}"]`),
    ).toHaveTextContent(formatCompactCurrency(euros).replace(/\u00a0/g, " "));
  });

  it("exposes the contacts counter as a dedicated tutorial region", () => {
    render(
      <TitleBar
        currentMonth={9}
        nextMonthAt={61_000}
        now={1_000}
        contactsAwaitingEmail={2}
        activeMembers={0}
        fame={0}
        euros={25}
        equipment={equipment}
        isPaused={false}
        onTogglePause={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Contatti da contattare: 2")).toHaveAttribute(
      "data-tutorial-region",
      "contacts-counter",
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
        fame={0}
        followers={1_250}
        euros={0}
        equipment={equipment}
        isPaused={false}
        onTogglePause={() => undefined}
      />,
    );

    expect(screen.getByLabelText(`Follower Social: ${formatExactNumber(1_250)}`)).toHaveTextContent(
      `Follower${formatCompactNumber(1_250)}`,
    );

    rerender(
      <TitleBar
        currentMonth={9}
        nextMonthAt={61_000}
        now={1_000}
        contactsAwaitingEmail={0}
        activeMembers={0}
        fame={0}
        euros={0}
        equipment={equipment}
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
        fame={0}
        euros={0}
        equipment={equipment}
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
        fame={0}
        euros={0}
        equipment={equipment}
        isPaused
        onTogglePause={onTogglePause}
      />,
    );
    expect(screen.getByRole("button", { name: "Riprendi" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
