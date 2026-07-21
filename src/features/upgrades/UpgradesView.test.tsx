import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByRole("button", { name: /Apri dettagli Istruttore Promisquo/ })).toBeVisible();
    const noHardFeelings = screen.getByRole("button", { name: /Apri dettagli Nessun Rancore/ });
    expect(noHardFeelings).toBeVisible();
    expect(noHardFeelings).toHaveTextContent("Nessun Rancore");
    expect(noHardFeelings.querySelector("em")).toHaveTextContent("Rancor");
    expect(screen.getByRole("button", { name: /Apri dettagli Doppio Corso/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Apri dettagli PagoSport/ })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /^Apri dettagli/ })).toHaveLength(54);
  });

  it("shows requirements, effect and disabled level-up action for a locked node", () => {
    render(<UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /Apri dettagli Pagina aggiornata/ }));

    expect(screen.getByRole("dialog", { name: "Pagina aggiornata" })).toBeVisible();
    expect(document.querySelector(".upgrade-dialog-backdrop")).not.toBeInTheDocument();
    expect(screen.getByText("+15% produzione Social per livello")).toBeVisible();
    expect(screen.getByText("Serve Fama della scuola 10")).toBeVisible();
    expect(screen.getByRole("button", { name: "Potenzia" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Apri dettagli Pagina aggiornata/ })).not.toHaveClass("unaffordable");

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

  it("recommends the cheapest available upgrade and buys it directly", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 1_000 },
    };
    const onBuyUpgrade = vi.fn();
    render(<UpgradesView state={state} onBuyUpgrade={onBuyUpgrade} />);

    const recommendation = screen.getByRole("region", { name: "Upgrade raccomandato" });
    expect(within(recommendation).getByText("Presentazione preparata")).toBeVisible();
    expect(within(recommendation).getByText(/Livello 1 · 50,00/)).toBeVisible();

    fireEvent.click(within(recommendation).getByRole("button", {
      name: "Potenzia Presentazione preparata",
    }));

    expect(onBuyUpgrade).toHaveBeenCalledOnce();
    expect(onBuyUpgrade).toHaveBeenCalledWith("prepared-presentation");
  });

  it("disables the recommended quick upgrade when the balance is insufficient", () => {
    const initial = createInitialState(1_000);
    render(
      <UpgradesView
        state={{ ...initial, school: { ...initial.school, euros: 20 } }}
        onBuyUpgrade={() => undefined}
      />,
    );

    const recommendation = screen.getByRole("region", { name: "Upgrade raccomandato" });
    expect(within(recommendation).getByText("Presentazione preparata")).toBeVisible();
    expect(within(recommendation).getByRole("button", {
      name: "Potenzia Presentazione preparata",
    })).toBeDisabled();
    expect(within(recommendation).getByText(/Mancano 30,00/)).toBeVisible();
  });

  it("summarizes every cumulative benefit received from upgrades", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      player: { ...initial.player, writingPower: 3 },
      upgrades: {
        ...initial.upgrades,
        "comfortable-keyboard": 5,
        "prepared-presentation": 3,
        "coordinated-demo": 1,
        "organized-rack": 2,
        "registration-form": 1,
        "instructor-versatility": 2,
        "technical-arena": 1,
      },
    };
    render(<UpgradesView state={state} onBuyUpgrade={() => undefined} />);

    const summary = screen.getByLabelText("Riepilogo dei bonus ottenuti dagli upgrade");
    expect(within(summary).getByText("Caratteri per input:")).toBeVisible();
    expect(within(summary).getByText("3")).toBeVisible();
    expect(within(summary).getByText("Contatti:")).toBeVisible();
    expect(within(summary).getByText("+30%")).toBeVisible();
    expect(within(summary).getByText("Pubblico eventi:")).toBeVisible();
    expect(within(summary).getByText("+20%")).toBeVisible();
    expect(within(summary).getByText("Spade:")).toBeVisible();
    expect(within(summary).getByText("+4")).toBeVisible();
    expect(within(summary).getByText("Entrate:")).toBeVisible();
    expect(within(summary).getByText("+10%")).toBeVisible();
    expect(within(summary).getByText("Rami per Istruttore:")).toBeVisible();
    expect(within(summary).getByText("+2")).toBeVisible();
    expect(within(summary).getByText("Arena Tecnica:")).toBeVisible();
    expect(within(summary).getByText("livello 1")).toBeVisible();
  });

  it("marks an unlocked unaffordable upgrade node until enough funds are available", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 0 },
    };
    const { rerender } = render(
      <UpgradesView state={state} onBuyUpgrade={() => undefined} />,
    );

    const upgradeNode = screen.getByRole("button", {
      name: /Apri dettagli Presentazione preparata/,
    });
    expect(upgradeNode).toHaveClass("available", "unaffordable");
    expect(upgradeNode.querySelector(".upgrade-node-icon")).toBeVisible();

    rerender(
      <UpgradesView
        state={{ ...state, school: { ...state.school, euros: 50 } }}
        onBuyUpgrade={() => undefined}
      />,
    );

    expect(upgradeNode).toHaveClass("available");
    expect(upgradeNode).not.toHaveClass("unaffordable");
  });
});
