import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { UpgradesView } from "./UpgradesView";

afterEach(cleanup);

describe("UpgradesView", () => {
  it("renders every data-driven upgrade branch", () => {
    render(<UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />);

    expect(screen.getByRole("tab", { name: "Consigliati (4)" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Catalogo completo (47)" }));

    expect(screen.getByRole("heading", { name: "Velocità di scrittura" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Carisma" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Scrittura" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Accoglienza" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Social" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Attrezzatura" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Organizzazione" })).toBeVisible();
    expect(screen.getAllByText("Prezzo")).toHaveLength(47);
    expect(screen.getByText(/^50,00/)).toBeVisible();
    expect(screen.getByRole("region", { name: "Entrate dell'Ordine" }))
      .toHaveTextContent(/40,00.*quota mensile/);
    expect(screen.getByText(/al mese/)).toBeVisible();
    expect(screen.getAllByRole("button", { name: /Fondi insufficienti/ })).toHaveLength(4);
  });

  it("shows only actionable branches in the available filter", () => {
    render(<UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />);

    fireEvent.click(screen.getByRole("tab", { name: "Disponibili (4)" }));

    expect(screen.getAllByText("Prezzo")).toHaveLength(4);
    expect(screen.queryByRole("heading", { name: "Social" })).not.toBeInTheDocument();
    expect(screen.getByText(/Prossimo sblocco/)).toBeVisible();
  });

  it("allows a funded purchase without a member-gated unlock", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 50 },
    };
    const onBuyUpgrade = vi.fn();
    render(<UpgradesView state={state} onBuyUpgrade={onBuyUpgrade} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Acquista.*Presentazione preparata/ }),
    );

    expect(onBuyUpgrade).toHaveBeenCalledOnce();
    expect(onBuyUpgrade).toHaveBeenCalledWith("prepared-presentation");
  });
});
