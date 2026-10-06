import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getUpgradeDefinition, UPGRADE_DEFINITIONS } from "../../content/upgrades";
import { createInitialState } from "../../game/engine";
import { buyAllAffordableUpgrades } from "../../game/upgradeFlow";
import { formatStat } from "../../shared/formatters";
import { UpgradesView } from "./UpgradesView";
import { stripKeywordMarkup } from "../../shared/keywordMarkup";

afterEach(cleanup);

/** Every public upgrade completed except `keep`, so every node of the tree is in sight. */
function withOpenTree(keep?: string) {
  const initial = createInitialState(1_000);
  const upgrades = { ...initial.upgrades };
  for (const definition of UPGRADE_DEFINITIONS) {
    if (definition.category !== "secrets" && definition.id !== keep) upgrades[definition.id] = definition.maxLevel;
  }
  return {
    ...initial,
    upgrades,
    school: { ...initial.school, fame: 1_000_000 },
    unlocks: { ...initial.unlocks, gadget: true, social: true },
  };
}

const HIDDEN = { name: "Potenziamento da scoprire" };

describe("UpgradesView", () => {
  it("keeps Social upgrades in their parent branches, hidden as a «?» until they open", () => {
    render(<UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />);

    expect(screen.queryByRole("heading", { name: "Social" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apri dettagli Sintesi dei contenuti/ }))
      .not.toBeInTheDocument();
    const writing = screen.getByRole("region", { name: "Scrittura" });
    expect(within(writing).getAllByRole("img", HIDDEN).length).toBeGreaterThan(0);
    expect(within(writing).getAllByRole("img", HIDDEN)[0]).toHaveTextContent(/^\?$/);
    expect(within(writing).queryByText(/punti in Scrittura/)).not.toBeInTheDocument();
  });

  it("reveals the ten Gadget upgrades only after the sector unlocks", () => {
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
    expect(
      within(gadgetBranch).queryAllByRole("button", { name: /^Apri dettagli/ }).length +
      within(gadgetBranch).queryAllByRole("img", HIDDEN).length,
    ).toBe(10);
  });

  it("shows the Rete dell'Ordine lane from the first foundation, locked by schools founded", () => {
    const initial = createInitialState(1_000);
    render(
      <UpgradesView
        state={{ ...initial, network: { ...initial.network, schoolCount: 1 } }}
        onBuyUpgrade={() => undefined}
      />,
    );
    const lane = screen.getByRole("region", { name: "Rete dell'Ordine" });
    expect(
      within(lane).queryAllByRole("button", { name: /^Apri dettagli/ }).length +
      within(lane).queryAllByRole("img", HIDDEN).length,
    ).toBe(10);
    // What a hidden node needs stays a surprise too.
    expect(within(lane).queryByText("20 scuole fondate")).not.toBeInTheDocument();
  });

  it("renders eight public branches, the secret row and the merged Teaching row", () => {
    render(<UpgradesView state={withOpenTree()} onBuyUpgrade={() => undefined} />);

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
      // A completed branch adds «(completo)» for screen readers.
      expect(screen.getByRole("heading", { name: new RegExp(`^${heading}`) })).toBeVisible();
    }
    expect(within(screen.getByRole("region", { name: /^Creatività/ }))
      .getByText(/^35 punti Creatività · prova dopo l'email \d+%/)).toBeVisible();
    expect(screen.getByRole("button", { name: /Apri dettagli Master of none/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Apri dettagli Il costo del Servizio/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Apri dettagli Nessun Rancore/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Apri dettagli PagoSport/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Apri dettagli Preparazione agonistica/ }))
      .not.toBeInTheDocument();
    // One line per branch: 9 + 8 + 9 + 9 + 8 + 10 + 9 + 8 nodes, no side branches;
    // the Rete dell'Ordine lane waits for the first foundation.
    expect(screen.getAllByRole("button", { name: /^Apri dettagli/ })).toHaveLength(70);
    expect(screen.queryByRole("heading", { name: "Rete dell'Ordine" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apri dettagli Ritmo di battitura/ })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /^Percorso segreto/ })).toHaveLength(2);
    expect(screen.queryByText("Corso X")).not.toBeInTheDocument();
    expect(screen.queryByText("ToccoDiGilo")).not.toBeInTheDocument();

    const teachingBranch = screen.getByRole("region", { name: /^Insegnamento/ });
    const teachingButtons = within(teachingBranch).getAllByRole("button", {
      name: /^Apri dettagli/,
    });
    expect(teachingButtons).toHaveLength(9);
    expect(teachingButtons[0]).toHaveAccessibleName(/Apri dettagli Occhio del Maestro/);
    expect(teachingButtons[3]).toHaveAccessibleName(/Apri dettagli Istruttori in e-Learning/);
    expect(teachingButtons[7]).toHaveAccessibleName(/Apri dettagli Nessun Rancore/);
    expect(teachingButtons[8]).toHaveAccessibleName(/Apri dettagli PagoSport/);
    expect(within(teachingButtons[7]).getByText("Rancor", { selector: "em" })).toBeVisible();
  });

  it("shows both secret hints and reveals only the discovered path", () => {
    const initial = createInitialState(1_000);
    const { rerender } = render(
      <UpgradesView state={initial} onBuyUpgrade={() => undefined} />,
    );

    const secrets = screen.getAllByRole("button", { name: /^Percorso segreto/ });
    fireEvent.click(secrets[0]);
    expect(screen.getByRole("dialog", { name: "???" })).toHaveTextContent(
      "Indizio: Vincere il torneo più superbo dell'anno è solo l'inizio",
    );
    fireEvent.click(secrets[1]);
    expect(screen.getByRole("dialog", { name: "???" })).toHaveTextContent(
      "Esistono forze più grandi di quanto avresti mai potuto immaginare",
    );
    fireEvent.keyDown(window, { key: "Escape" });

    rerender(
      <UpgradesView
        state={{ ...initial, secretUpgradeDiscoveries: ["project-x"] }}
        onBuyUpgrade={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: /Apri dettagli Corso X/ })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /^Percorso segreto/ })).toHaveLength(1);
    expect(screen.queryByText("ToccoDiGilo")).not.toBeInTheDocument();
  });

  it("does not name the hidden node that follows in the details window", () => {
    render(<UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />);

    const writing = screen.getByRole("region", { name: "Scrittura" });
    const firstHidden = within(writing).getAllByRole("img", HIDDEN)[0].closest("li")!;
    const before = firstHidden.previousElementSibling as HTMLElement;
    fireEvent.click(within(before).getByRole("button", { name: /^Apri dettagli/ }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Poi nel ramo: da scoprire");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows requirements and effect of a Social node once it opens", () => {
    render(<UpgradesView state={withOpenTree("social-content-synthesis")} onBuyUpgrade={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: /Apri dettagli Sintesi dei contenuti/ }));

    expect(screen.getByRole("dialog", { name: "Sintesi dei contenuti" })).toBeVisible();
    expect(screen.getByText(
      getUpgradeDefinition("social-content-synthesis")!.effectLabel,
    )).toBeVisible();
    expect(screen.getByText("Social sbloccato (15 collaboratori)")).toBeVisible();
  });

  it("shows the complete Percorso Tecnico progression", () => {
    render(
      <UpgradesView state={createInitialState(1_000)} onBuyUpgrade={() => undefined} />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: /Apri dettagli Percorso Tecnico/,
    }));

    expect(screen.getByText(
      getUpgradeDefinition("technical-arena")!.effectLabel,
    )).toBeVisible();
  });

  it("shows the complete Master of none progression", () => {
    render(
      <UpgradesView state={withOpenTree("instructor-versatility")} onBuyUpgrade={() => undefined} />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: /Apri dettagli Master of none/,
    }));

    expect(screen.getByText("Effetto").nextElementSibling).toHaveTextContent(
      stripKeywordMarkup(getUpgradeDefinition("instructor-versatility")!.effectLabel),
    );
  });

  it("shows the complete Nessun Rancore progression", () => {
    render(
      <UpgradesView state={withOpenTree("agonist-course-intensity")} onBuyUpgrade={() => undefined} />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: /Apri dettagli Nessun Rancore/,
    }));

    expect(screen.getByText(
      getUpgradeDefinition("agonist-course-intensity")!.effectLabel,
    )).toBeVisible();
  });

  it("reveals a node when its branch has enough points", () => {
    const initial = createInitialState(1_000);
    const state = {
      ...initial,
      school: { ...initial.school, euros: 10_000 },
    };
    const { rerender } = render(
      <UpgradesView state={state} onBuyUpgrade={() => undefined} />,
    );

    expect(screen.queryByRole("button", { name: /Apri dettagli Biglietti con QR code/ }))
      .not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Carisma" })).queryByText(/punti in Carisma/))
      .not.toBeInTheDocument();

    rerender(
      <UpgradesView
        state={{
          ...state,
          upgrades: { ...state.upgrades, "prepared-presentation": 3 },
        }}
        onBuyUpgrade={() => undefined}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Apri dettagli Biglietti con QR code/ }),
    );
    expect(screen.getByRole("button", { name: /^Compra ·/ })).toBeEnabled();
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
    fireEvent.click(screen.getByRole("button", { name: /^Compra ·/ }));

    expect(onBuyUpgrade).toHaveBeenCalledWith("comfortable-keyboard");
  });

  it("recommends the first cheapest available upgrade and buys it directly", () => {
    const initial = createInitialState(1_000);
    const onBuyUpgrade = vi.fn();
    render(<UpgradesView
      state={{ ...initial, school: { ...initial.school, euros: 1_000 } }}
      onBuyUpgrade={onBuyUpgrade}
    />);

    // Only the cheapest node carries a buy button, right under the node itself.
    expect(screen.getAllByRole("button", { name: /^Compra / })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Compra Tastiera comoda" }));
    expect(onBuyUpgrade).toHaveBeenCalledWith("comfortable-keyboard");

  });

  it("previews Compra tutto with the same count and total the engine would buy", () => {
    const initial = createInitialState(1_000);
    const state = { ...initial, school: { ...initial.school, euros: 1_000 } };
    const after = buyAllAffordableUpgrades(state);
    const count = Object.keys(after.upgrades).reduce(
      (sum, id) => sum + after.upgrades[id as keyof typeof after.upgrades] - state.upgrades[id as keyof typeof state.upgrades],
      0,
    );
    const onBuyAllUpgrades = vi.fn();
    render(<UpgradesView state={state} onBuyUpgrade={() => undefined} onBuyAllUpgrades={onBuyAllUpgrades} />);

    expect(count).toBeGreaterThan(1);
    const button = screen.getByRole("button", {
      name: `Compra tutto: ${count} upgrade per ${formatStat(1_000 - after.school.euros)} €`,
    });
    fireEvent.click(button);
    expect(onBuyAllUpgrades).toHaveBeenCalledTimes(1);
  });

  it("disables the recommendation when the balance is insufficient", () => {
    const initial = createInitialState(1_000);
    render(
      <UpgradesView
        state={{ ...initial, school: { ...initial.school, euros: 5 } }}
        onBuyUpgrade={() => undefined}
      />,
    );

    const quickBuy = screen.getByRole("button", { name: "Compra Tastiera comoda" });
    expect(quickBuy).toBeDisabled();
    expect(quickBuy).toHaveAttribute("title", expect.stringMatching(/^Mancano 8,00/));
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
        "instructor-versatility": 5,
        "technical-arena": 1,
      },
    };
    render(<UpgradesView state={state} onBuyUpgrade={() => undefined} />);

    const summary = screen.getByLabelText("Riepilogo dei bonus ottenuti dagli upgrade");
    (summary as HTMLDetailsElement).open = true;
    expect(within(summary).getByText("Caratteri per input")).toBeVisible();
    expect(within(summary).getByText("2")).toBeVisible();
    expect(within(summary).getByText("Contatti")).toBeVisible();
    expect(within(summary).getByText("+12%")).toBeVisible();
    expect(within(summary).getByText("Pubblico eventi")).toBeVisible();
    expect(within(summary).getAllByText("+5%")).toHaveLength(2);
    expect(within(summary).getByText("Riserva manutenzione")).toBeVisible();
    expect(within(summary).getByText("24 punti")).toBeVisible();
    expect(within(summary).getByText("Quote mensili")).toBeVisible();
    expect(within(summary).queryByText("Spade")).not.toBeInTheDocument();
    expect(within(summary).getByText("Rami per Istruttore")).toBeVisible();
    expect(within(summary).getByText("+2")).toBeVisible();
    expect(within(summary).getByText("Superamento corsi")).toBeVisible();
    expect(within(summary).getByText("+20%")).toBeVisible();
    expect(within(summary).getByText("Rami dopo Corso Y")).toBeVisible();
    expect(within(summary).getByText("tutti")).toBeVisible();
    expect(within(summary).getByText("Arena Tecnica")).toBeVisible();
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
