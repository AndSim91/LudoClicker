import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GAME_CONFIG } from "../../game/config";
import { createInitialState } from "../../game/engine";
import { GameStateProvider } from "../../game/GameStateContext";
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
const monthlyIncomeState = createInitialState(1_000, "Test", false);

afterEach(cleanup);

describe("TitleBar", () => {
  it("keeps the sword menu open when the tutorial card is pressed", () => {
    const onEquipmentOpenChange = vi.fn();
    render(
      <GameStateProvider state={monthlyIncomeState}>
        <TitleBar
          currentMonth={9}
          nextMonthAt={1_000 + GAME_CONFIG.gameMonthMs}
          now={1_000}
          contactsAwaitingEmail={0}
          activeMembers={15}
          fame={0}
          euros={0}
          monthlyIncomeState={monthlyIncomeState}
          equipment={equipment}
          isPaused={false}
          onTogglePause={() => undefined}
          equipmentOpen
          onEquipmentOpenChange={onEquipmentOpenChange}
        />
        <div className="tutorial-card"><button type="button">Continua</button></div>
      </GameStateProvider>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "Continua" }));
    expect(onEquipmentOpenChange).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(onEquipmentOpenChange).toHaveBeenCalledWith(false);
  });

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
        monthlyIncomeState={monthlyIncomeState}
        equipment={equipment}
        isPaused={false}
        onTogglePause={() => undefined}
      />,
    );

    expect(screen.getByLabelText("Situazione del gioco")).toHaveTextContent(
      formatCompactCurrency(120).replace(/\u00a0/g, " "),
    );
    expect(screen.getByText("Iscritti")).toBeVisible();
    const availability = screen.getByLabelText(/^Fondi:/);
    const monthlyIncome = screen.getByLabelText(/^Entrate mensili:/);
    expect(availability.closest(".title-resources")).toBeInTheDocument();
    expect(monthlyIncome).toHaveTextContent("al mese");
    const fame = screen.getByLabelText("Fama della scuola: 7");
    const equipmentIndicator = screen.getByLabelText(
      "Spade disponibili: 6 su 6; 0 rotte; 0 punti di usura",
    );
    const pause = screen.getByRole("button", { name: "Pausa" });
    expect(fame).toHaveTextContent("Fama7");
    expect(equipmentIndicator).toHaveTextContent("Spade6su 6");
    const swords = equipmentIndicator.closest(".title-equipment");
    expect(swords?.querySelector(".school-saber.repair-none")).toBeInTheDocument();
    expect(swords?.nextElementSibling).toBe(fame);
    // Fondi and «al mese» read together (Fase 8).
    expect(availability.nextElementSibling).toBe(monthlyIncome.closest(".title-monthly-income"));
    expect(fame.nextElementSibling).toBe(pause.parentElement);
    expect(pause.parentElement?.nextElementSibling).toBe(container.querySelector(".title-month"));
    // Without «Il tempo è denaro» there is no speed button.
    expect(screen.queryByRole("button", { name: /Velocità del gioco/ })).not.toBeInTheDocument();
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
        monthlyIncomeState={monthlyIncomeState}
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
        monthlyIncomeState={monthlyIncomeState}
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
        monthlyIncomeState={monthlyIncomeState}
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
        monthlyIncomeState={monthlyIncomeState}
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
        monthlyIncomeState={monthlyIncomeState}
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
        monthlyIncomeState={monthlyIncomeState}
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
        monthlyIncomeState={monthlyIncomeState}
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
        monthlyIncomeState={monthlyIncomeState}
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

  it("shows the «Il tempo è denaro» button next to the pause and cycles through the allowed speeds", () => {
    const onChangeGameSpeed = vi.fn();
    const props = {
      currentMonth: 9,
      nextMonthAt: 1_000 + GAME_CONFIG.gameMonthMs,
      now: 1_000,
      contactsAwaitingEmail: 0,
      activeMembers: 3,
      fame: 7,
      euros: 120,
      monthlyIncomeState,
      equipment,
      isPaused: false,
      onTogglePause: () => undefined,
      onChangeGameSpeed,
    };
    const { rerender } = render(<TitleBar {...props} gameSpeed={1} maxGameSpeed={3} />);
    const pause = screen.getByRole("button", { name: "Pausa" });
    const speed = screen.getByRole("button", { name: "Velocità del gioco 1×: passa a 2×" });
    expect(pause.nextElementSibling).toBe(speed);
    expect(speed).toHaveTextContent("1×");
    fireEvent.click(speed);
    expect(onChangeGameSpeed).toHaveBeenLastCalledWith(2);

    rerender(<TitleBar {...props} gameSpeed={3} maxGameSpeed={3} />);
    fireEvent.click(screen.getByRole("button", { name: "Velocità del gioco 3×: passa a 1×" }));
    expect(onChangeGameSpeed).toHaveBeenLastCalledWith(1);

    rerender(<TitleBar {...props} gameSpeed={2} maxGameSpeed={2} />);
    expect(screen.getByRole("button", { name: "Velocità del gioco 2×: passa a 1×" })).toHaveClass("fast");
  });
});
