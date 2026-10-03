import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
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
});
