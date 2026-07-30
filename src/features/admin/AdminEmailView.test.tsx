import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminEmailView } from "./AdminEmailView";

afterEach(cleanup);

describe("AdminEmailView", () => {
  const renderAdmin = (
    onAddContacts = vi.fn(),
    onAddMembers = vi.fn(),
    onAddEuros = vi.fn(),
    onScheduleLegendaryTrial = vi.fn(),
    availableLegendaryProfiles = 3,
    onAdvanceMonth = vi.fn(),
    currentMonth = 9,
    onAddSwords = vi.fn(),
    gameSpeed = 1,
    onGameSpeedChange = vi.fn(),
    onResetGadgetSales = vi.fn(),
    gadgetUnitsSold = 12,
  ) => {
    return render(
      <AdminEmailView
        totalContacts={8}
        availableContacts={4}
        activeMembers={4}
        euros={250}
        totalSwords={6}
        availableSwords={6}
        damagedSwords={0}
        currentMonth={currentMonth}
        availableLegendaryProfiles={availableLegendaryProfiles}
        gadgetUnitsSold={gadgetUnitsSold}
        gameSpeed={gameSpeed}
        onGameSpeedChange={onGameSpeedChange}
        onAddContacts={onAddContacts}
        onAddMembers={onAddMembers}
        onAddEuros={onAddEuros}
        onAddSwords={onAddSwords}
        onAdvanceMonth={onAdvanceMonth}
        onScheduleLegendaryTrial={onScheduleLegendaryTrial}
        onResetGadgetSales={onResetGadgetSales}
      />,
    );
  };

  it("shows only the game resource tools", () => {
    renderAdmin();

    expect(screen.getByRole("heading", { name: "Admin" })).toBeVisible();
    expect(screen.getByText(/Totali: 8/)).toHaveTextContent("disponibili: 4");
    expect(screen.queryByRole("textbox", { name: "Oggetto" })).not.toBeInTheDocument();
    expect(screen.queryByText(/cataloghi email/i)).not.toBeInTheDocument();
  });

  it("advances to the named next month", () => {
    const onAdvanceMonth = vi.fn();
    renderAdmin(vi.fn(), vi.fn(), vi.fn(), vi.fn(), 3, onAdvanceMonth, 12);

    expect(screen.getByText("Passa da Dicembre a Gennaio")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Passa a Gennaio" }));

    expect(onAdvanceMonth).toHaveBeenCalledOnce();
  });

  it("changes and resets the global game speed", () => {
    const onGameSpeedChange = vi.fn();
    const { rerender } = renderAdmin(
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      3,
      vi.fn(),
      9,
      vi.fn(),
      1,
      onGameSpeedChange,
    );

    const slider = screen.getByRole("slider", { name: "Moltiplicatore" });
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "10");
    expect(slider).toHaveAttribute("step", "1");
    expect(screen.getAllByText("1×")).toHaveLength(2);
    expect(screen.getByText("5×")).toBeVisible();
    expect(screen.getByText("10×")).toBeVisible();
    expect(screen.getByRole("button", { name: "Imposta velocità 1×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.change(slider, {
      target: { value: "4" },
    });
    expect(onGameSpeedChange).toHaveBeenCalledWith(4);

    fireEvent.change(slider, {
      target: { value: "10" },
    });
    expect(onGameSpeedChange).toHaveBeenLastCalledWith(10);
    fireEvent.click(screen.getByRole("button", { name: "Imposta velocità 5×" }));
    expect(onGameSpeedChange).toHaveBeenLastCalledWith(5);
    expect(screen.getByRole("button", { name: "Ripristina 1×" })).toBeDisabled();

    rerender(
      <AdminEmailView
        totalContacts={8}
        availableContacts={4}
        activeMembers={4}
        euros={250}
        totalSwords={6}
        availableSwords={6}
        damagedSwords={0}
        currentMonth={9}
        availableLegendaryProfiles={3}
        gadgetUnitsSold={12}
        gameSpeed={10}
        onGameSpeedChange={onGameSpeedChange}
        onAddContacts={vi.fn()}
        onAddMembers={vi.fn()}
        onAddEuros={vi.fn()}
        onAddSwords={vi.fn()}
        onAdvanceMonth={vi.fn()}
        onScheduleLegendaryTrial={vi.fn()}
        onResetGadgetSales={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Imposta velocità 10×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Ripristina 1×" }));
    expect(onGameSpeedChange).toHaveBeenLastCalledWith(1);
  });

  it("submits the manually entered changes", () => {
    const onAddContacts = vi.fn();
    const onAddMembers = vi.fn();
    const onAddEuros = vi.fn();
    const onAddSwords = vi.fn();
    renderAdmin(onAddContacts, onAddMembers, onAddEuros, vi.fn(), 3, vi.fn(), 9, onAddSwords);

    expect(screen.getByLabelText("Contatti email")).toHaveValue(1);
    expect(screen.getByLabelText("Iscritti")).toHaveValue(1);
    expect(screen.getByLabelText("Euro")).toHaveValue(1000);
    expect(screen.getByLabelText("Spade")).toHaveValue(1);

    fireEvent.change(screen.getByLabelText("Contatti email"), {
      target: { value: "-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Modifica contatti" }));
    fireEvent.change(screen.getByLabelText("Iscritti"), {
      target: { value: "-7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Modifica iscritti" }));
    fireEvent.change(screen.getByLabelText("Euro"), {
      target: { value: "1250.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Modifica Euro" }));
    fireEvent.change(screen.getByLabelText("Spade"), {
      target: { value: "-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Modifica spade" }));

    expect(onAddContacts).toHaveBeenCalledWith(-2);
    expect(onAddMembers).toHaveBeenCalledWith(-7);
    expect(onAddEuros).toHaveBeenCalledWith(1250.5);
    expect(onAddSwords).toHaveBeenCalledWith(-2);
  });

  it("starts a Legendary trial without presenting it as a direct enrollment", () => {
    const onScheduleLegendaryTrial = vi.fn();
    renderAdmin(vi.fn(), vi.fn(), vi.fn(), onScheduleLegendaryTrial);

    expect(screen.getByText("Profili disponibili: 3")).toBeVisible();
    expect(screen.getByText(/senza creare iscrizioni dirette/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Avvia prova Leggendario" }));

    expect(onScheduleLegendaryTrial).toHaveBeenCalledOnce();
  });

  it("resets Gadget sale counts from the Admin tools", () => {
    const onResetGadgetSales = vi.fn();
    renderAdmin(
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      3,
      vi.fn(),
      9,
      vi.fn(),
      1,
      vi.fn(),
      onResetGadgetSales,
      42,
    );

    expect(screen.getByText("Pezzi attualmente registrati: 42")).toBeVisible();
    fireEvent.click(screen.getByRole("button", {
      name: "Azzera conteggi prodotti Gadget",
    }));

    expect(onResetGadgetSales).toHaveBeenCalledOnce();
  });

  it("disables the Legendary trial when the current school has no available profiles", () => {
    const onScheduleLegendaryTrial = vi.fn();
    renderAdmin(vi.fn(), vi.fn(), vi.fn(), onScheduleLegendaryTrial, 0);

    const button = screen.getByRole("button", { name: "Avvia prova Leggendario" });
    expect(button).toBeDisabled();
    expect(screen.getByText(/nessun profilo Leggendario disponibile/i)).toBeVisible();
    fireEvent.click(button);

    expect(onScheduleLegendaryTrial).not.toHaveBeenCalled();
  });
});
