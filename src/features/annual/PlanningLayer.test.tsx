import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GAME_CONFIG } from "../../game/config";
import { createInitialState } from "../../game/engine";
import { collectFees } from "../../game/membershipFlow";
import { AnnualReportLayer } from "./AnnualReportLayer";
import { PlanningLayer } from "./PlanningLayer";

afterEach(cleanup);

function august() {
  let state = createInitialState(0);
  state = { ...state, school: { ...state.school, activeMembers: 20, peakActiveMembers: 20 } };
  state = collectFees(state, state.school.nextFeeAt + 6 * GAME_CONFIG.gameMonthMs, 1);
  return {
    ...state,
    school: { ...state.school, euros: 5_000 },
    upgrades: { ...state.upgrades, "official-supplier": 1 },
  };
}

describe("PlanningLayer", () => {
  it("shows the pagella, then the plan, and confirms what was planned", () => {
    const onConfirm = vi.fn();
    render(<PlanningLayer state={august()} now={0} onConfirm={onConfirm} />);
    expect(screen.getByText("Iscrizioni")).toBeVisible();
    expect(screen.queryByText(/Ammesso/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Avanti ›" }));
    // Forme ancora chiuse: la SIS è solo «Prossimamente».
    expect(screen.getByText("Prossimamente")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Acquista 1 spada/ }));
    expect(screen.getByText("Spade nuove acquistate ×1")).toBeVisible();
    expect(screen.getByText("Spese provvisorie ancora da confermare")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Conferma il piano" }));
    expect(onConfirm).toHaveBeenCalledWith({ courses: [], repair: false, swords: 1 });
  });

  it("opens the Report annuale on the year so far, without grades", () => {
    render(<AnnualReportLayer state={august()} now={0} onClose={() => undefined} />);
    expect(screen.getByText("Anno in corso, senza voti")).toBeVisible();
    expect(screen.queryByLabelText(/^Voto /)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Anno precedente · pagella" }));
    expect(screen.getAllByLabelText(/^Voto /).length).toBeGreaterThan(0);
  });
});
