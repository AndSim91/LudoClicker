import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { LIGHT_INFLATION_CAUSES, LIGHT_INFLATION_MOMENT, getLightInflationEventDescription } from "../../game/lightInflation";
import { SUPERBA_MOMENT } from "../../game/moments";
import { MOMENT_DURATION_MS, MomentLayer } from "./MomentLayer";
import { getFoundationTitle } from "./momentContent";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MomentLayer", () => {
  it("plays until «Salta», then stays still until «Chiudi» or a click anywhere", () => {
    vi.useFakeTimers();
    const state = createInitialState(1_000, "Verifica UI");
    const onDismiss = vi.fn();
    render(<MomentLayer state={state} momentKey="legendary:eva-parodi" onDismiss={onDismiss} />);

    const dialog = screen.getByRole("dialog", { name: "Un Leggendario entra nell'Ordine" });
    expect(dialog).toBeVisible();
    expect(screen.getByText(/Eva Parodi entra nella scuola/)).toBeVisible();
    // While it plays a click on the scene does nothing; «Salta» and Esc close it.
    fireEvent.click(dialog);
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Salta" }));
    expect(onDismiss).toHaveBeenCalledTimes(2);

    // At the end it does not close on its own.
    act(() => { vi.advanceTimersByTime(MOMENT_DURATION_MS * 3); });
    expect(onDismiss).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Chiudi" }));
    expect(onDismiss).toHaveBeenCalledTimes(3);
    fireEvent.click(dialog);
    expect(onDismiss).toHaveBeenCalledTimes(4);
  });

  it("announces Inflazione di Luce with the yearly cause and the price going up", () => {
    const initial = createInitialState(1_000, "Verifica UI");
    const state = {
      ...initial,
      lightInflation: {
        ...initial.lightInflation,
        priceMultiplier: 1.35,
        event: { cause: LIGHT_INFLATION_CAUSES[5], increase: 0.35, occurredAt: 0, visibleUntil: 0 },
      },
    };
    const { container } = render(
      <MomentLayer state={state} momentKey={LIGHT_INFLATION_MOMENT} onDismiss={vi.fn()} />,
    );

    expect(screen.getByRole("dialog", {
      name: "Inflazione di Luce",
      // The causes are an inside joke that Andrea rewrites; the test follows the list.
      description: getLightInflationEventDescription(LIGHT_INFLATION_CAUSES[5]),
    })).toBeVisible();
    expect(container.querySelector(".moment-price")).toHaveTextContent(
      "Spada per combattimento sportivo330,00 € → 445,50 € (+35%)",
    );
  });

  it("draws a new star of the Ordine at every foundation", () => {
    const initial = createInitialState(1_000, "Verifica UI");
    const schools = Array.from({ length: 10 }, (_, index) => ({
      name: index === 0 ? "Ordine delle Onde" : `Scuola ${index + 1}`,
      city: index === 9 ? "Bergamo" : `Città ${index + 1}`,
      ...(index < 2 ? {} : { fame: 1_000 + index * 300 }),
    }));
    const state = {
      ...initial,
      school: { ...initial.school, name: "Scuola del Vento", city: "Torino" },
      network: { ...initial.network, schools, schoolCount: 10 },
    };
    const { container } = render(<MomentLayer state={state} momentKey="foundation" onDismiss={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "L'undicesima sede dell'Ordine" })).toBeVisible();
    expect(screen.getByText("Scuola 10 entra nella Rete con 3.700 di Fama; Scuola del Vento apre a Torino.")).toBeVisible();
    expect(screen.getByText("10 → 11 di 25")).toBeVisible();
    // Ten schools left are ten stars, two of them without Fama; the other fourteen wait as faint dots.
    expect(container.querySelectorAll(".moment-star")).toHaveLength(10);
    expect(container.querySelectorAll(".moment-star.is-unknown")).toHaveLength(1);
    expect(container.querySelectorAll(".moment-constellation-ghost circle")).toHaveLength(14);
  });

  it("names the school in Italian ordinals", () => {
    expect(getFoundationTitle(2)).toBe("La seconda sede dell'Ordine");
    expect(getFoundationTitle(11)).toBe("L'undicesima sede dell'Ordine");
    expect(getFoundationTitle(23)).toBe("La ventitreesima sede dell'Ordine");
    expect(getFoundationTitle(28)).toBe("La ventottesima sede dell'Ordine");
    expect(getFoundationTitle(81)).toBe("L'ottantunesima sede dell'Ordine");
    expect(getFoundationTitle(120)).toBe("La centoventesima sede dell'Ordine");
    expect(getFoundationTitle(306)).toBe("La trecentoseiesima sede dell'Ordine");
    expect(getFoundationTitle(1200)).toBe("La sede n° 1.200 dell'Ordine");
  });

  it("announces the Torneo della Superba with the Lanterna and the medal", () => {
    const initial = createInitialState(1_000, "Verifica UI");
    const state = {
      ...initial,
      tournaments: { ...initial.tournaments, reptile: { ...initial.tournaments.reptile, fameXp: 1_040 } },
    };
    const { container } = render(<MomentLayer state={state} momentKey={SUPERBA_MOMENT} onDismiss={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Nasce il Torneo della Superba!" })).toBeVisible();
    expect(screen.getByText("Il Torneo Reptile si evolve")).toBeVisible();
    expect(container.querySelector(".superba-tower .superba-lamp")).not.toBeNull();
    expect(container.querySelector(".superba-medal")?.getAttribute("src")).toBe("/assets/superba-logo.webp");
    expect(container.querySelector(".superba-plaque")?.textContent).toContain("Fama 1.040 · livello 2");
  });
});
