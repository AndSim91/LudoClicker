import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { GameState } from "../../game/types";
import { NetworkView } from "./NetworkView";

afterEach(() => cleanup());

const ready = (): GameState => {
  const initial = createInitialState(1_000);
  return { ...initial, tournaments: { ...initial.tournaments, nationalTitlesCurrentSchool: 1 } };
};

it("founds a new school in three steps, with placeholders and steppers", () => {
  const onFoundSchool = vi.fn();
  const onFoundationOpenChange = vi.fn();
  const locked = createInitialState(1_000);
  const { unmount } = render(<NetworkView state={locked} onFoundSchool={onFoundSchool} />);
  expect(screen.getByRole("button", { name: "Fonda una nuova scuola…" })).toBeDisabled();
  unmount();

  render(<NetworkView state={ready()} onFoundSchool={onFoundSchool} onFoundationOpenChange={onFoundationOpenChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Fonda una nuova scuola…" }));
  expect(onFoundationOpenChange).toHaveBeenLastCalledWith(true);

  // Step 1: the placeholders show what to write; Avanti waits for name and city.
  expect(screen.getByLabelText("Nome della scuola")).toHaveAttribute("placeholder", "Ordine delle Onde");
  expect(screen.getByLabelText("Città")).toHaveAttribute("placeholder", "Genova");
  expect(screen.getByRole("button", { name: "Avanti" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Nome della scuola"), { target: { value: "Onde di Levante" } });
  fireEvent.change(screen.getByLabelText("Città"), { target: { value: "La Spezia" } });
  fireEvent.click(screen.getByRole("button", { name: "Avanti" }));

  // Step 2: only the point of the national title, so one + and the others stop.
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi un punto a Genetica" }));
  expect(screen.getByRole("button", { name: "Aggiungi un punto a Email/Social" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Avanti" }));

  // Step 3: one definitive button.
  fireEvent.click(screen.getByRole("button", { name: "Fonda Onde di Levante" }));
  expect(onFoundSchool).toHaveBeenCalledWith(
    { name: "Onde di Levante", city: "La Spezia", accentColor: "#0f6cbd" },
    expect.objectContaining({ rent: 0, upgrades: expect.objectContaining({ genetics: 1 }) }),
  );
  expect(onFoundationOpenChange).toHaveBeenLastCalledWith(false);
});

it("draws the schools left on the map and collapses the older ones", () => {
  const initial = ready();
  const schools = [{ name: "Ordine delle Onde", city: "Genova", fame: 900 }, { name: "Lame del Faro", city: "Trieste" }];
  render(<NetworkView state={{ ...initial, network: { ...initial.network, schools, schoolCount: 12, monthlyRent: 1_450 } }} onFoundSchool={vi.fn()} />);

  expect(screen.getByText("13 sedi, una sola Reputazione.")).toBeInTheDocument();
  expect(screen.getByText("altre 10")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Lame del Faro/ }));
  expect(screen.getByText("N° 12 · Lame del Faro · Trieste · Fama non registrata")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "« Sede madre" }));
  expect(screen.getByText(/N° 1 · Ordine delle Onde · Genova · Fama alla partenza 900 · Sede madre/)).toBeInTheDocument();
  expect(screen.getByText(/^1\.?450,00 €\/mese$/)).toBeInTheDocument();
});
