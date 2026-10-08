import { describe, expect, it } from "vitest";

import {
  addDebt,
  getCashAdvanceRate,
  getDebtInstallment,
  getDebtTotal,
  getSpendableEuros,
  isDebtBlocked,
  payDebtInstallment,
} from "./debt";
import { createInitialState } from "./engine";
import { buyOfficialSword } from "./equipment";

function withCashAdvance(level: number, euros = 0) {
  const initial = createInitialState(1_000);
  return {
    ...initial,
    school: { ...initial.school, euros },
    upgrades: { ...initial.upgrades, "cash-advance": level, "official-supplier": 1 },
  };
}

describe("debt", () => {
  it("follows the lender of each level", () => {
    expect([0, 1, 2, 3, 4, 5].map((level) => getCashAdvanceRate(withCashAdvance(level).upgrades)))
      .toEqual([undefined, 0.2, 0.1625, 0.125, 0.0875, 0.05]);
  });

  it("pays 12 installments from the first month, then clears", () => {
    let state = addDebt(withCashAdvance(1, 10_000), 1_200, 9);
    expect(getDebtTotal(state)).toBe(1_440);
    expect(getDebtInstallment(state)).toBe(120);

    state = payDebtInstallment(state, 8, 0);
    expect(state.school.euros).toBe(10_000);

    for (let month = 9; month < 21; month += 1) state = payDebtInstallment(state, month, month);
    expect(state.debt).toBeUndefined();
    expect(state.school.euros).toBeCloseTo(10_000 - 1_440, 0);
    expect(state.messages[0].subject).toBe("Debito saldato");
  });

  it("recomputes the installment when the rate improves", () => {
    const state = addDebt(withCashAdvance(1), 1_200, 9);
    expect(getDebtInstallment({ ...state, upgrades: { ...state.upgrades, "cash-advance": 5 } })).toBe(105);
  });

  it("blocks paid spending after 12 unpaid months, keeps it free otherwise", () => {
    let state = addDebt(withCashAdvance(1, 0), 1_000, 9);
    for (let month = 9; month < 21; month += 1) state = payDebtInstallment(state, month, month);
    expect(isDebtBlocked(state)).toBe(true);
    expect(state.messages[0].subject).toBe("Debito scaduto");

    state = { ...state, school: { ...state.school, euros: 5_000 } };
    expect(getSpendableEuros(state)).toBe(0);
    expect(buyOfficialSword(state, 1)).toBe(state);

    // The next month takes everything owed, and the school is free again.
    state = payDebtInstallment(state, 21, 21);
    expect(state.debt).toBeUndefined();
    expect(getSpendableEuros(state)).toBe(5_000 - 1_200);
  });
});
