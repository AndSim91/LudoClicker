import { describe, expect, it } from "vitest";

import {
  closeAnnualMonth,
  findAnnualMarks,
  getAnnualYearData,
  gradeAnnualYear,
  pickAnnualHighlight,
  takeAnnualSnapshot,
} from "./annualReport";
import { GAME_CONFIG } from "./config";
import { createInitialState, gameReducer } from "./engine";
import { collectFees } from "./membershipFlow";
import { addAdminMembers } from "./adminFlow";
import type { AnnualMark, AnnualReport, FormId, TournamentResult } from "./types";
import { getSchoolYear } from "./calendar";

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

  it("stops a long catch-up at July when the Pianificazione opens (Andrea, 13/10)", () => {
    let state = createInitialState(0);
    state = {
      ...state,
      school: { ...state.school, activeMembers: 20, peakActiveMembers: 20 },
      network: { ...state.network, schoolCount: 1 },
    };
    // A background tab wakes up half a year later: one TICK for the whole gap.
    const later = state.school.nextFeeAt + 11 * GAME_CONFIG.gameMonthMs;
    const ticked = gameReducer(state, { type: "TICK", now: later, gainMultiplier: 1 });

    expect(ticked.school.currentMonth).toBe(7);
    expect(ticked.annual?.planningOpen).toBe(true);
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

  it("grades Risultati Agonistici without the Scolastico, and no grade if it is the only one (15/10/2026)", () => {
    const state = createInitialState(0);
    const data = getAnnualYearData(state, 0);
    const entry = (level: TournamentResult["level"], place: number) => ({ result: { level } as TournamentResult, place });
    const grade = (tournaments: ReturnType<typeof entry>[]) =>
      gradeAnnualYear(state, { ...data, tournaments }).tournaments;

    expect(grade([entry("school", 1)])).toBeUndefined();
    expect(grade([])).toBeUndefined();
    // The Accademico always counts, also when the hidden rule makes the school lose it.
    expect(grade([entry("school", 1), entry("academy", 20)])).toBe("E");
    expect(grade([entry("school", 1), entry("academy", 1)])).toBe("A");
    expect(grade([entry("academy", 1), entry("national", 40)])).toBe("A");
  });

  it("grades the year, then one grade up or down against the year before (15/10/2026)", () => {
    const state = createInitialState(0);
    const data = { ...getAnnualYearData(state, 0), schoolYear: 4 };
    const previous = (numbers: AnnualReport["numbers"]) =>
      ({ schoolYear: 3, month: 0, grades: [], months: [], numbers, schoolCount: 0 }) as AnnualReport;

    // Iscrizioni: the arrivals of the year alone, a lower bar in the first three years.
    expect(gradeAnnualYear(state, { ...data, enrolled: 320 }).enrollment).toBe("A");
    expect(gradeAnnualYear(state, { ...data, enrolled: 20 }).enrollment).toBe("E");
    expect(gradeAnnualYear(state, { ...data, schoolYear: 0, enrolled: 20 }).enrollment).toBe("B");
    expect(gradeAnnualYear(state, { ...data, schoolYear: 0, enrolled: 3 }).enrollment).toBe("E");
    // 160 arrivals is a B; 25% more than last year makes it A, 25% less a C.
    expect(gradeAnnualYear(state, { ...data, enrolled: 160 }, previous({ enrollment: 100 })).enrollment).toBe("A");
    expect(gradeAnnualYear(state, { ...data, enrolled: 160 }, previous({ enrollment: 240 })).enrollment).toBe("C");
    // A pagella of another school or of an older year is not compared.
    expect(gradeAnnualYear(state, { ...data, enrolled: 160 }, { ...previous({ enrollment: 100 }), schoolCount: 1 }).enrollment).toBe("B");
    expect(gradeAnnualYear(state, { ...data, enrolled: 160 }, { ...previous({ enrollment: 100 }), schoolYear: 2 }).enrollment).toBe("B");

    // Fidelizzazione: no grade in year 0, when nobody can leave.
    expect(gradeAnnualYear(state, { ...data, schoolYear: 0 }).loyalty).toBeUndefined();

    // Finanze: income per month against last year, +50% A · +20% B · +5% C · −10% D.
    const months = (earned: number) => Array.from({ length: 12 }, (_, month) => ({ month, earned, enrolled: 0 }));
    const finances = (earned: number) =>
      gradeAnnualYear(state, { ...data, months: months(earned) }, previous({ finances: 1_000 })).finances;
    expect(finances(1_600)).toBe("A");
    expect(finances(1_300)).toBe("B");
    expect(finances(1_100)).toBe("C");
    expect(finances(950)).toBe("D");
    expect(finances(800)).toBe("E");
  });

  it("counts the June departures in the pagella of that year (14/10/2026)", () => {
    let state = addAdminMembers(createInitialState(0), 600);
    state = { ...state, school: { ...state.school, currentMonth: 13 } };
    for (let month = 0; month < 6; month += 1) state = collectFees(state, state.school.nextFeeAt, 1);
    const loyalty = state.annual!.report!.grades.find((row) => row.subject === "loyalty")!.text;
    expect(state.statistics.membersDeparted).toBeGreaterThan(0);
    expect(loyalty).toBe(`${state.statistics.membersDeparted} andati via, ${state.school.activeMembers} rimasti`);
  });

  it("from 500 Iscritti a course of the year lowers the departures instead of cancelling them", () => {
    const run = (members: number) => {
      let state = addAdminMembers(createInitialState(0), members);
      const year = getSchoolYear(18);
      state = {
        ...state,
        school: { ...state.school, currentMonth: 13 },
        contacts: state.contacts.map((contact) => contact.status === "enrolled"
          ? { ...contact, forms: ["form-1", "form-2", "course-y", "form-3-long"] as FormId[], lastFormTrainingYear: year }
          : contact),
      };
      for (let month = 0; month < 6; month += 1) state = collectFees(state, state.school.nextFeeAt, 1);
      return state.statistics.membersDeparted;
    };
    expect(run(450)).toBe(0);
    expect(run(800)).toBeGreaterThan(100);
  });
});

