import { describe, expect, it } from "vitest";

import {
  closeAnnualMonth,
  findAnnualMarks,
  pickAnnualHighlight,
  takeAnnualSnapshot,
} from "./annualReport";
import { GAME_CONFIG } from "./config";
import { createInitialState, gameReducer } from "./engine";
import { collectFees } from "./membershipFlow";
import type { AnnualMark } from "./types";

describe("annual report", () => {
  it("writes the pagella; the Pianificazione waits for the first Torneo Scolastico and can be switched off", () => {
    const start = createInitialState(0);
    const early = collectFees(start, start.school.nextFeeAt + 6 * GAME_CONFIG.gameMonthMs, 1);
    expect(early.annual?.report).toBeDefined();
    expect(early.annual?.planningOpen).toBe(false);

    const veteran = { ...start, network: { ...start.network, schoolCount: 1 } };
    const off = { ...veteran, annual: { ...veteran.annual, planningDisabled: true } };
    expect(collectFees(off, off.school.nextFeeAt + 6 * GAME_CONFIG.gameMonthMs, 1).annual?.planningOpen).toBe(false);
    expect(gameReducer(off, { type: "SET_ANNUAL_PLANNING", enabled: true }).annual?.planningDisabled).toBe(false);
  });

  it("writes the pagella and opens the Pianificazione at the start of July", () => {
    let state = createInitialState(0);
    state = {
      ...state,
      school: { ...state.school, activeMembers: 20, peakActiveMembers: 20 },
      network: { ...state.network, schoolCount: 1 },
    };
    // January … June closed: the game enters July.
    state = collectFees(state, state.school.nextFeeAt + 5 * GAME_CONFIG.gameMonthMs, 1);
    expect(state.school.currentMonth).toBe(7);
    expect(state.annual?.planningOpen).toBe(true);
    const report = state.annual!.report!;
    expect(report.schoolYear).toBe(0);
    expect(report.grades.map((row) => row.subject)).toEqual([
      "enrollment", "loyalty", "teaching", "tournaments", "administration", "finances",
    ]);
    // No Forme and no tournaments yet: nothing to grade there.
    expect(report.grades.find((row) => row.subject === "teaching")?.grade).toBeUndefined();
    expect(report.grades.find((row) => row.subject === "tournaments")?.text).toBe("Nessun torneo disputato");
    expect(report.months.map((month) => month.month)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(report.months[0].earned).toBeGreaterThan(0);
  });

  it("starts a new ledger with the school year", () => {
    let state = createInitialState(0);
    state = collectFees(state, state.school.nextFeeAt + 7 * GAME_CONFIG.gameMonthMs, 1);
    expect(state.school.currentMonth).toBe(9);
    expect(state.annual?.ledger?.schoolYear).toBe(1);
    expect(state.annual?.ledger?.months).toEqual([]);
  });

  it("finds what happened in a month", () => {
    const state = createInitialState(0);
    const before = takeAnnualSnapshot(state, 0);
    const marks = findAnnualMarks(before, {
      ...before,
      collaborators: 1,
      peakActiveMembers: 120,
      council: true,
      legendaries: ["secret:marco-palena"],
    }, 3);
    expect(marks.map((mark) => [mark.category, mark.title])).toEqual([
      [1, "Nasce il Consiglio delle Onde"],
      [3, "Arriva un Leggendario Segreto: Marco Palena è dei nostri"],
      [4, "Il primo collaboratore entra in squadra"],
      [5, "100 iscritti"],
    ]);
  });

  it("picks the highest category, never the same 3–5 two years in a row", () => {
    const marks: AnnualMark[] = [
      { category: 5, title: "250 iscritti", month: 10, rarity: 250 },
      { category: 4, title: "Il primo Istruttore della scuola", month: 3, rarity: 0 },
      { category: 4, title: "La prima Forma insegnata", month: 5, rarity: 0 },
    ];
    const state = createInitialState(0);
    const data = { enrolled: 4 } as never;
    expect(pickAnnualHighlight(marks, {}, data)).toMatchObject({
      title: "La prima Forma insegnata",
      mentions: ["Il primo Istruttore della scuola · marzo", "250 iscritti · ottobre"],
    });
    expect(pickAnnualHighlight(marks, {}, data, 4).title).toBe("250 iscritti");
    expect(closeAnnualMonth(state, 1, 0).annual?.ledger?.months).toHaveLength(1);
  });
});
