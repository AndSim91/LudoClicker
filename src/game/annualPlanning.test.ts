import { describe, expect, it } from "vitest";

import {
  confirmAnnualPlan,
  getAnnualForecast,
  getDebtCapacity,
  simulateAnnualPlan,
} from "./annualPlanning";
import { GAME_CONFIG } from "./config";
import { getDebtTotal } from "./debt";
import { createInitialState } from "./engine";
import { collectFees } from "./membershipFlow";
import { createInitialCollaboratorMastery } from "../content/mastery";
import type { Collaborator, Contact, GameState } from "./types";

function instructor(index: number): Collaborator {
  return {
    id: `collaborator-${index}`,
    contactId: `contact-${index}`,
    displayName: `Collaboratore ${index}`,
    joinedAt: 1_000 + index,
    forms: ["form-1", "course-x", "form-2"],
    instructorForms: ["form-1"],
    formBranchPreferences: [],
    assignment: "instructor",
    mastery: createInitialCollaboratorMastery(),
    rarity: "ultra-rare",
  };
}

function august(euros: number, upgrades: Partial<GameState["upgrades"]> = {}): GameState {
  let state = createInitialState(0);
  state = { ...state, school: { ...state.school, activeMembers: 20, peakActiveMembers: 20 } };
  state = collectFees(state, state.school.nextFeeAt + 6 * GAME_CONFIG.gameMonthMs, 1);
  return {
    ...state,
    school: { ...state.school, euros },
    upgrades: { ...state.upgrades, "official-supplier": 1, ...upgrades },
    equipment: { ...state.equipment, damagedSwords: 1, availableSwords: state.equipment.availableSwords - 1 },
  };
}

describe("Pianificazione delle Onde", () => {
  it("forecasts the next school year from September", () => {
    const forecast = getAnnualForecast(august(0));
    expect(forecast.months.map((month) => month.month)).toEqual(Array.from({ length: 12 }, (_, i) => 9 + i));
    expect(forecast.total).toBeGreaterThan(0);
  });

  it("confirms repair and swords at today's price and closes the planning", () => {
    const state = august(10_000);
    const plan = { courses: [], repair: true, swords: 2 };
    const simulated = simulateAnnualPlan(state, plan, 0);
    expect(simulated.items.map((item) => item.label)).toEqual(["Riparazione spade", "Spade nuove acquistate ×2"]);

    const confirmed = confirmAnnualPlan(state, plan, 0);
    expect(confirmed.annual?.planningOpen).toBe(false);
    expect(confirmed.school.euros).toBeCloseTo(10_000 - simulated.cost, 2);
    expect(confirmed.equipment.totalSwords).toBe(state.equipment.totalSwords + 2);
    expect(confirmed.equipment.damagedSwords).toBe(0);
    expect(confirmed.lightInflation.purchasedSwords).toBe(2);
    expect(confirmed.annual?.report?.plan).toMatchObject({ repaired: true, swordsBought: 2, borrowed: 0 });
    expect(confirmed.debt).toBeUndefined();
  });

  it("refuses to go below zero without «Anticipo di cassa»", () => {
    const state = august(100);
    expect(confirmAnnualPlan(state, { courses: [], repair: false, swords: 1 }, 0)).toBe(state);
  });

  it("borrows the shortfall up to next year's forecast, with interest", () => {
    const state = august(100, { "cash-advance": 1 });
    const capacity = getDebtCapacity(state);
    expect(capacity).toBeCloseTo(getAnnualForecast(state).total / 1.2, 0);

    const confirmed = confirmAnnualPlan(state, { courses: [], repair: false, swords: 1 }, 0);
    const price = GAME_CONFIG.officialSwordCost;
    expect(confirmed.school.euros).toBe(0);
    expect(confirmed.debt).toMatchObject({ principal: price - 100, monthsLeft: 12, firstMonth: 9 });
    expect(getDebtTotal(confirmed)).toBeCloseTo((price - 100) * 1.2, 2);

    const tooMany = Math.ceil((capacity + 100) / price) + 1;
    expect(confirmAnnualPlan(state, { courses: [], repair: false, swords: tooMany }, 0)).toBe(state);
  });

  it("sends instructors to the SIS: as many as planned, the best first", () => {
    const base = august(100_000);
    const state: GameState = {
      ...base,
      unlocks: { ...base.unlocks, forms: true },
      collaborators: [instructor(1), instructor(2), instructor(3)],
      contacts: [1, 2, 3].map((index) => ({
        id: `contact-${index}`, arenaBase: 100, styleBase: 100 * index, forms: [], tournamentExperience: 0,
      }) as unknown as Contact),
    };
    const plan = { courses: [{ formId: "form-2" as const, track: "instructor" as const, count: 2 }], repair: false, swords: 0 };
    const simulated = simulateAnnualPlan(state, plan, 5_000);
    expect(simulated.items).toMatchObject([{ label: "Corso Istruttori · Forma 2 ×2", count: 2 }]);

    const confirmed = confirmAnnualPlan(state, plan, 5_000);
    expect(confirmed.collaborators.map((collaborator) => collaborator.training?.formId)).toEqual([undefined, "form-2", "form-2"]);
    expect(confirmed.school.euros).toBeCloseTo(100_000 - simulated.cost, 2);
  });
});
