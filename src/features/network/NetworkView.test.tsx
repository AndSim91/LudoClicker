import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { GameState } from "../../game/types";
import { NetworkView } from "./NetworkView";

afterEach(() => cleanup());

const ready = (): GameState => {
  const initial = createInitialState(1_000);
  // An Accademico title (1 point) and 128 Fama (1 point): 2 points to spend.
  return {
    ...initial,
    school: { ...initial.school, fame: 128 },
    tournaments: { ...initial.tournaments, academyTitlesCurrentSchool: 1 },
  };
};

it("founds a new school from one page: name and city, old points white and fixed, new ones gold", () => {
  const onFoundSchool = vi.fn();
  const onFoundationOpenChange = vi.fn();
  const locked = createInitialState(1_000);
  const { unmount } = render(<NetworkView state={locked} onFoundSchool={onFoundSchool} />);
  expect(screen.getByRole("button", { name: "Fonda una nuova scuola…" })).toBeDisabled();
  unmount();

  const base = ready();
  const state = { ...base, network: { ...base.network, reputationUpgrades: { genetics: 3 } } };
  render(<NetworkView state={state} onFoundSchool={onFoundSchool} onFoundationOpenChange={onFoundationOpenChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Fonda una nuova scuola…" }));
  expect(onFoundationOpenChange).toHaveBeenLastCalledWith(true);

  expect(screen.queryByLabelText("Colore")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Nome della scuola")).toHaveAttribute("placeholder", "Ordine delle Onde");
  expect(screen.getByLabelText("Città")).toHaveAttribute("placeholder", "Genova");

  // The 3 points spent in an earlier school show, white, and cannot be taken back.
  const genetics = screen.getByLabelText("Genetica: 3");
  expect(genetics).not.toHaveClass("is-added");
  expect(screen.getByRole("button", { name: "Togli un punto da Genetica" })).toBeDisabled();
  // Only the 2 points of the Accademico and the Fama: each + turns gold, then the others stop.
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi un punto a Genetica" }));
  expect(screen.getByLabelText("Genetica: 4")).toHaveClass("is-added");
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi un punto a Email/Social" }));
  expect(screen.getByRole("button", { name: "Aggiungi un punto a Genetica" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Togli un punto da Genetica" }));
  expect(screen.getByLabelText("Genetica: 3")).not.toHaveClass("is-added");
  expect(screen.getByRole("button", { name: "Togli un punto da Genetica" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi un punto a Genetica" }));

  expect(screen.getByRole("button", { name: "Fonda la scuola" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Nome della scuola"), { target: { value: "Onde di Levante" } });
  fireEvent.change(screen.getByLabelText("Città"), { target: { value: "La Spezia" } });
  fireEvent.click(screen.getByRole("button", { name: "Fonda Onde di Levante" }));
  expect(onFoundSchool).toHaveBeenCalledWith(
    { name: "Onde di Levante", city: "La Spezia" },
    expect.objectContaining({ rent: 0, upgrades: expect.objectContaining({ genetics: 1, writing: 1 }) }),
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
