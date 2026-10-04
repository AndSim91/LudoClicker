import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import { LIGHT_INFLATION_CAUSES, LIGHT_INFLATION_MOMENT } from "../../game/lightInflation";
import { MOMENT_DURATION_MS, MomentLayer } from "./MomentLayer";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MomentLayer", () => {
  it("shows the moment, closes on Esc, the button or after its duration", () => {
    vi.useFakeTimers();
    const state = createInitialState(1_000, "Verifica UI");
    const onDismiss = vi.fn();
    render(<MomentLayer state={state} momentKey="legendary:eva-parodi" onDismiss={onDismiss} />);

    expect(screen.getByRole("dialog", { name: "Un Leggendario entra nell'Ordine" })).toBeVisible();
    expect(screen.getByText(/Eva Parodi entra nella scuola/)).toBeVisible();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: /Continua/ }));
    act(() => { vi.advanceTimersByTime(MOMENT_DURATION_MS); });
    expect(onDismiss).toHaveBeenCalledTimes(3);
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
      description: "Lama di Luce aumenta i costi delle spade a causa della ricostruzione post terremoto del Friuli.",
    })).toBeVisible();
    expect(container.querySelector(".moment-price")).toHaveTextContent(
      "Spada per combattimento sportivo330,00 € → 445,50 € (+35%)",
    );
  });
});
