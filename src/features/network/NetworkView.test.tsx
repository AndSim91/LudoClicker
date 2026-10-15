import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialState } from "../../game/engine";
import type { GameState } from "../../game/types";
import { NetworkView } from "./NetworkView";

afterEach(() => cleanup());

const ready = (): GameState => {
  const initial = createInitialState(1_000);
  // An Accademico title (2 points) and no Fama: 2 points to spend.
  return {
    ...initial,
    school: { ...initial.school, fame: 0 },
    tournaments: { ...initial.tournaments, academyTitlesCurrentSchool: 1 },
  };
};

it("founds a new school from one page: name and city, old points white and fixed, new ones as a gold +n", () => {
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
  expect(screen.getByLabelText("Genetica: 3")).toHaveTextContent(/^3$/);
  expect(screen.getByRole("button", { name: "Togli un punto da Genetica" })).toBeDisabled();
  // Only the 2 points of the Accademico: each + turns gold, then the others stop.
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi un punto a Genetica" }));
  expect(screen.getByLabelText("Genetica: 4")).toHaveTextContent("3+1");
  expect(screen.getByText("+40%", { selector: ".foundation-now" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi un punto a Scrittura" }));
  expect(screen.getByRole("button", { name: "Aggiungi un punto a Genetica" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Togli un punto da Genetica" }));
  expect(screen.getByLabelText("Genetica: 3")).toHaveTextContent(/^3$/);
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

it("shows the Chronicles row only once they are unlocked, with the tournament points of 15/10", () => {
  const base = ready();
  const { unmount } = render(<NetworkView state={base} onFoundSchool={vi.fn()} />);
  expect(screen.queryByText("Chronicles of Ludosport")).not.toBeInTheDocument();
  expect(screen.getByText("Champion's Arena").closest("li")).toHaveTextContent("+4 possibili");
  unmount();

  const chronicles = { ...base.tournaments.chronicles, unlocked: true };
  render(<NetworkView state={{ ...base, tournaments: { ...base.tournaments, chronicles } }} onFoundSchool={vi.fn()} />);
  expect(screen.getByText("Chronicles of Ludosport").closest("li")).toHaveTextContent("+5 possibili");
});
