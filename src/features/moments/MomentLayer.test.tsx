import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { LIGHT_INFLATION_CAUSES, LIGHT_INFLATION_MOMENT, getLightInflationEventDescription } from "../../game/lightInflation";
import { CHRONICLES_KEY_MOMENT, GADGET_MOMENT, SOCIAL_MOMENT, SUPERBA_MOMENT } from "../../game/moments";
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

    const dialog = screen.getByRole("dialog", { name: "Eva Parodi" });
    expect(dialog).toBeVisible();
    expect(screen.getByText("Leggendario · #002")).toBeVisible();
    expect(screen.getByText("Si unisce alla nostra Scuola!")).toBeVisible();
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

  it("plays «Ombra lunga» for a Leggendario Segreto, with its fixed Ludodex number", () => {
    const { container } = render(
      <MomentLayer state={createInitialState(1_000, "Verifica UI")} momentKey="legendary:pietro-scarica" onDismiss={vi.fn()} />,
    );
    expect(screen.getByRole("dialog", { name: "Pietro Scarica" })).toHaveClass("is-secret");
    expect(screen.getByText("Leggendario Segreto · #014")).toBeVisible();
    expect(container.querySelectorAll(".lg-banner")).toHaveLength(2);
    expect(container.querySelector(".lg-saber")).toBeInTheDocument();
  });

  it("opens the Chronicles door: six nameless figures, and the key in the Outlook notice", () => {
    const { container } = render(
      <MomentLayer state={createInitialState(1_000, "Verifica UI")} momentKey={CHRONICLES_KEY_MOMENT} onDismiss={vi.fn()} />,
    );
    expect(screen.getByRole("dialog", { name: "La porta delle Chronicles si apre" })).toBeVisible();
    expect(screen.getByText(/un Leggendario Segreto ti sfiderà/)).toBeVisible();
    expect(container.querySelectorAll(".chronicles-figure")).toHaveLength(6);
    expect(screen.getByText("Chiavi disponibili")).toBeInTheDocument();
    expect(screen.getByText("6 atleti")).toBeInTheDocument();
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
    expect(screen.getByText("Scuola 10 entra nel Network con 3.700 di Fama; Scuola del Vento apre a Torino.")).toBeVisible();
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

  it("opens the Social with the phone counting to the followers, and the Laboratorio with four gadgets (06/10)", () => {
    vi.useFakeTimers();
    const initial = createInitialState(1_000, "Verifica UI");
    const state = { ...initial, unlocks: { ...initial.unlocks, social: true }, school: { ...initial.school, followers: 47 } };
    const { container, unmount } = render(<MomentLayer state={state} momentKey={SOCIAL_MOMENT} onDismiss={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "La Redazione diventa Social" })).toBeVisible();
    expect(container.querySelector(".social-count")?.textContent).toBe("0");
    act(() => { vi.advanceTimersByTime(MOMENT_DURATION_MS); });
    expect(container.querySelector(".social-count")?.textContent).toBe("47");
    expect(container.querySelector(".moment-social image")?.getAttribute("href")).toBe("/assets/ordine-emblem.webp");
    unmount();

    const gadget = render(<MomentLayer state={state} momentKey={GADGET_MOMENT} onDismiss={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Apre il Laboratorio Gadget" })).toBeVisible();
    expect(gadget.container.querySelectorAll(".gadget-real")).toHaveLength(4);
    expect(gadget.container.querySelectorAll(".gadget-real image")).toHaveLength(4);
    // No names and no prices on the blueprint.
    expect(gadget.container.querySelector(".moment-gadget text")).toBeNull();
  });
});
