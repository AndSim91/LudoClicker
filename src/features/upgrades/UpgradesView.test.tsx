import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { UpgradesView } from "./UpgradesView";

afterEach(cleanup);

describe("UpgradesView", () => {
  it("renders the complete upgrade catalog as eight connected branches", () => {
    const initial = createInitialState(1_000);
    render(
      <UpgradesView
        state={{ ...initial, school: { ...initial.school, historicMembers: 5 } }}
        onBuyUpgrade={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Piano dei potenziamenti" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Velocità di scrittura" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Carisma" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Scrittura" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Accoglienza" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Social" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Attrezzatura" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Organizzazione" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Istruttori" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /^Apri dettagli/ })).toHaveLength(48);
  });

  it("shows requirements, effect and disabled level-up action for a locked node", () => {
    render(<UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /Apri dettagli Pagina aggiornata/ }));

    expect(screen.getByRole("dialog", { name: "Pagina aggiornata" })).toBeVisible();
    expect(document.querySelector(".upgrade-dialog-backdrop")).not.toBeInTheDocument();
    expect(screen.getByText("+15% produzione Social per livello")).toBeVisible();
    expect(screen.getByText("Servono 10 iscritti storici")).toBeVisible();
    expect(screen.getByRole("button", { name: "Potenzia" })).toBeDisabled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("requires every previous upgrade in the branch to be completed", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 10_000, historicMembers: 100 },
    };
    const { rerender } = render(
      <UpgradesView state={state} onBuyUpgrade={() => undefined} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Apri dettagli Biglietti con QR code/ }),
    );
    expect(screen.getByText("Completa prima Presentazione preparata")).toBeVisible();
    expect(screen.getByRole("button", { name: "Potenzia" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Chiudi dettagli" }));
    rerender(
      <UpgradesView
        state={{
          ...state,
          upgrades: { ...state.upgrades, "prepared-presentation": 5 },
        }}
        onBuyUpgrade={() => undefined}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Apri dettagli Biglietti con QR code/ }),
    );
    expect(screen.getByText("Pronto per il livello successivo")).toBeVisible();
    expect(screen.getByRole("button", { name: "Potenzia" })).toBeEnabled();
  });

  it("allows a funded level-up from the selected node dialog", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 50 },
    };
    const onBuyUpgrade = vi.fn();
    render(<UpgradesView state={state} onBuyUpgrade={onBuyUpgrade} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Apri dettagli Presentazione preparata/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Potenzia" }));

    expect(onBuyUpgrade).toHaveBeenCalledOnce();
    expect(onBuyUpgrade).toHaveBeenCalledWith("prepared-presentation");
  });
});
