import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { UpgradesView } from "./UpgradesView";

afterEach(cleanup);

describe("UpgradesView", () => {
  it("keeps Social upgrades in their parent branches and visibly locked", () => {
    render(<UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />);

    expect(screen.queryByRole("heading", { name: "Social" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: /Apri dettagli Sintesi dei contenuti:.*social non ancora sbloccato/i,
    })).toBeVisible();
  });

  it("reveals the seven Gadget upgrades only after the sector unlocks", () => {
    const initial = createInitialState(1_000);
    const { rerender } = render(
      <UpgradesView state={initial} onBuyUpgrade={() => undefined} />,
    );

    expect(screen.queryByRole("heading", { name: "Gadget" })).not.toBeInTheDocument();

    rerender(
      <UpgradesView
        state={{ ...initial, unlocks: { ...initial.unlocks, gadget: true } }}
        onBuyUpgrade={() => undefined}
      />,
    );

    const gadgetBranch = screen.getByRole("region", { name: "Gadget" });
    expect(within(gadgetBranch).getAllByRole("button", { name: /^Apri dettagli/ }))
      .toHaveLength(7);
  });

  it("renders eight public branches, the secret row and the merged Teaching row", () => {
    const initial = createInitialState(1_000);
    render(
      <UpgradesView
        state={{
          ...initial,
          unlocks: { ...initial.unlocks, gadget: true, social: true },
        }}
        onBuyUpgrade={() => undefined}
      />,
    );

    for (const heading of [
      "Scrittura",
      "Creatività",
      "Carisma",
      "Accoglienza",
      "Attrezzatura",
      "Gadget",
      "Insegnamento",
      "Organizzazione",
      "Percorsi Segreti",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }
    expect(screen.getByRole("button", { name: /Apri dettagli Master of none/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Apri dettagli Il costo del Servizio/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Apri dettagli Nessun Rancore/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Apri dettagli PagoSport/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Apri dettagli Preparazione agonistica/ }))
      .not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Apri dettagli/ })).toHaveLength(56);
    expect(screen.getAllByRole("button", { name: "???" })).toHaveLength(2);
    expect(screen.queryByText("Corso X")).not.toBeInTheDocument();
    expect(screen.queryByText("ToccoDiGilo")).not.toBeInTheDocument();

    const teachingBranch = screen.getByRole("region", { name: "Insegnamento" });
    const teachingButtons = within(teachingBranch).getAllByRole("button", {
      name: /^Apri dettagli/,
    });
    expect(teachingButtons).toHaveLength(7);
    expect(teachingButtons[5]).toHaveAccessibleName(/Apri dettagli Nessun Rancore/);
    expect(teachingButtons[6]).toHaveAccessibleName(/Apri dettagli PagoSport/);
    expect(within(teachingButtons[5]).getByText("Rancor", { selector: "em" })).toBeVisible();
  });

  it("shows both secret hints and reveals only the discovered path", () => {
    const initial = createInitialState(1_000);
    const { rerender } = render(
      <UpgradesView state={initial} onBuyUpgrade={() => undefined} />,
    );

    expect(screen.getByRole("tooltip", {
      name: /Vincere il torneo più superbo dell'anno è solo l'inizio/,
    })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", {
      name: /Esistono forze più grandi di quanto avresti mai potuto immaginare/,
    })).toBeInTheDocument();

    rerender(
      <UpgradesView
        state={{ ...initial, secretUpgradeDiscoveries: ["project-x"] }}
        onBuyUpgrade={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: /Apri dettagli Corso X/ })).toBeVisible();
    expect(screen.getAllByRole("button", { name: "???" })).toHaveLength(1);
    expect(screen.queryByText("ToccoDiGilo")).not.toBeInTheDocument();
  });

  it("shows requirements, effect and disabled purchase for a locked Social node", () => {
    const initial = createInitialState(1_000);
    render(<UpgradesView
      state={{ ...initial, unlocks: { ...initial.unlocks, social: true } }}
      onBuyUpgrade={() => undefined}
    />);

    fireEvent.click(screen.getByRole("button", { name: /Apri dettagli Sintesi dei contenuti/ }));

    expect(screen.getByRole("dialog", { name: "Sintesi dei contenuti" })).toBeVisible();
    expect(screen.getByText(
      "100.000 → 90.000 → 80.000 → 70.000 → 60.000 → 50.000 caratteri",
    )).toBeVisible();
    expect(screen.getByText("Completa prima Campi intelligenti")).toBeVisible();
    expect(screen.getByRole("button", { name: "Potenzia" })).toBeDisabled();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the complete Percorso Tecnico progression", () => {
    render(
      <UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: /Apri dettagli Percorso Tecnico/,
    }));

    expect(screen.getByText(
      "L1 Arena Tecnica · L2 durata 120→100 s · L3 durata 100→80 s · L4 durata 80→60 s · L5 durata 60→40 s",
    )).toBeVisible();
  });

  it("shows the complete Nessun Rancore progression", () => {
    render(
      <UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: /Apri dettagli Nessun Rancore/,
    }));

    expect(screen.getByText(
      "L1 Corso Agonisti (€1.000, 60 s) · L2–L4 massimo fino a +4/+4 · L5 Preparazione agonistica · L6–L9 +10% efficacia · L10 +10% efficacia e massimo +5/+5",
    )).toBeVisible();
  });

  it("requires every previous upgrade in a linear branch to be completed", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 10_000 },
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

  it("allows a funded purchase from the selected node dialog", () => {
    const initial = createInitialState(1_000);
    const onBuyUpgrade = vi.fn();
    render(<UpgradesView
      state={{ ...initial, school: { ...initial.school, euros: 50 } }}
      onBuyUpgrade={onBuyUpgrade}
    />);

    fireEvent.click(
      screen.getByRole("button", { name: /Apri dettagli Tastiera comoda/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Potenzia" }));

    expect(onBuyUpgrade).toHaveBeenCalledWith("comfortable-keyboard");
  });

  it("recommends the first cheapest available upgrade and buys it directly", () => {
    const initial = createInitialState(1_000);
    const onBuyUpgrade = vi.fn();
    render(<UpgradesView
      state={{ ...initial, school: { ...initial.school, euros: 1_000 } }}
      onBuyUpgrade={onBuyUpgrade}
    />);

    const recommendation = screen.getByRole("region", { name: "Upgrade raccomandato" });
    expect(within(recommendation).getByText("Tastiera comoda")).toBeVisible();
    fireEvent.click(within(recommendation).getByRole("button", {
      name: "Potenzia Tastiera comoda",
    }));
    expect(onBuyUpgrade).toHaveBeenCalledWith("comfortable-keyboard");
  });

  it("disables the recommendation when the balance is insufficient", () => {
    const initial = createInitialState(1_000);
    render(
      <UpgradesView
        state={{ ...initial, school: { ...initial.school, euros: 20 } }}
        onBuyUpgrade={() => undefined}
      />,
    );

    const recommendation = screen.getByRole("region", { name: "Upgrade raccomandato" });
    expect(within(recommendation).getByText("Tastiera comoda")).toBeVisible();
    expect(within(recommendation).getByRole("button", {
      name: "Potenzia Tastiera comoda",
    })).toBeDisabled();
    expect(within(recommendation).getByText(/Mancano 30,00/)).toBeVisible();
  });

  it("summarizes cumulative benefits without claiming free swords", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      player: { ...initial.player, writingPower: 2 },
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
    expect(within(summary).getByText("2")).toBeVisible();
    expect(within(summary).getByText("Contatti:")).toBeVisible();
    expect(within(summary).getByText("+12%")).toBeVisible();
    expect(within(summary).getByText("Pubblico eventi:")).toBeVisible();
    expect(within(summary).getAllByText("+5%")).toHaveLength(2);
    expect(within(summary).getByText("Riserva manutenzione:")).toBeVisible();
    expect(within(summary).getByText("24 punti")).toBeVisible();
    expect(within(summary).getByText("Quote mensili:")).toBeVisible();
    expect(within(summary).queryByText("Spade:")).not.toBeInTheDocument();
    expect(within(summary).getByText("Rami per Istruttore:")).toBeVisible();
    expect(within(summary).getByText("+2")).toBeVisible();
    expect(within(summary).getByText("Arena Tecnica:")).toBeVisible();
  });

  it("marks an unlocked unaffordable node until enough funds are available", () => {
    const initial = createInitialState(1_000);
    const state = { ...initial, school: { ...initial.school, euros: 0 } };
    const { rerender } = render(
      <UpgradesView state={state} onBuyUpgrade={() => undefined} />,
    );

    const upgradeNode = screen.getByRole("button", {
      name: /Apri dettagli Tastiera comoda/,
    });
    expect(upgradeNode).toHaveClass("available", "unaffordable");

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
