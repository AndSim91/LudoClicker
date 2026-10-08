import { getFormDefinition } from "../content/forms";
import { getCalendarMonth, getSchoolYearStartMonth, getSchoolYear } from "./calendar";
import { addDebt, getCashAdvanceRate, getDebtTotal, isDebtBlocked } from "./debt";
import { roundCurrency } from "./economy";
import {
  buyOfficialSword,
  getEquipmentMaintenanceCost,
  maintainEquipment,
} from "./equipment";
import { getOfficialSwordUnitCost } from "./lightInflation";
import { getMonthlyOperationalIncome } from "./membershipEconomy";
import {
  getTeacherCourseCandidates,
  startTeacherCourse,
  type QuickTrainingKind,
} from "./quickTeacherTraining";
import { isOfficialSwordSupplierVisible } from "./unlocks";
import type { AnnualPlan, AnnualPlanSummary, FormId, GameState, PlannedCourse } from "./types";

/*
 * Pianificazione delle Onde (Andrea, 08/10): at the start of July the game
 * pauses on the pagella and on the plan for the next school year. Everything
 * planned is provisional; «Conferma il piano» makes it real at once: SIS
 * courses start, swords are repaired and bought at today's price (they still
 * count for September's Inflazione di Luce). With «Anticipo di cassa» the plan
 * can go below zero, up to what next year is expected to earn (interest included).
 */

export const EMPTY_ANNUAL_PLAN: AnnualPlan = { courses: [], repair: false, swords: 0 };

export interface PlanItem {
  key: string;
  kind: "course" | "repair" | "swords";
  track?: QuickTrainingKind;
  formId?: FormId;
  label: string;
  count: number;
  cost: number;
}

export interface PlanOutcome {
  state: GameState;
  items: PlanItem[];
  cost: number;
}

// Fondi finti per simulare il piano: ogni voce costa la differenza.
const SIMULATION_FUNDS = 1e15;

function courseLabel(course: PlannedCourse): string {
  const form = getFormDefinition(course.formId)?.longName ?? course.formId;
  return `${course.track === "technician" ? "Corso Tecnici" : "Corso Istruttori"} · ${form}`;
}

/** Applies the plan in order (repair, swords, courses), each voce costing what it takes from the Fondi. */
function applyPlan(state: GameState, plan: AnnualPlan, now: number): PlanOutcome {
  let next = state;
  const items: PlanItem[] = [];
  const spend = (before: GameState) => roundCurrency(before.school.euros - next.school.euros);
  if (plan.repair) {
    const before = next;
    next = maintainEquipment(next);
    if (next !== before) items.push({ key: "repair", kind: "repair", label: "Riparazione spade", count: 1, cost: spend(before) });
  }
  if (plan.swords > 0 && isOfficialSwordSupplierVisible(next)) {
    const before = next;
    next = buyOfficialSword(next, plan.swords);
    if (next !== before) {
      items.push({ key: "swords", kind: "swords", label: `Spade nuove acquistate ×${plan.swords}`, count: plan.swords, cost: spend(before) });
    }
  }
  for (const course of plan.courses) {
    const before = next;
    let started = 0;
    for (let index = 0; index < course.count; index += 1) {
      const candidate = getTeacherCourseCandidates(next, course.formId, course.track)[0];
      if (!candidate) break;
      const after = startTeacherCourse(next, candidate.id, course.formId, course.track, now);
      if (after === next) break;
      next = after;
      started += 1;
    }
    if (started > 0) {
      items.push({
        key: `${course.track}:${course.formId}`,
        kind: "course",
        track: course.track,
        formId: course.formId,
        label: `${courseLabel(course)}${started > 1 ? ` ×${started}` : ""}`,
        count: started,
        cost: spend(before),
      });
    }
  }
  return { state: next, items, cost: roundCurrency(items.reduce((sum, item) => sum + item.cost, 0)) };
}

/** The plan as it would go, with unlimited Fondi: what each voce costs and what can still be added. */
export function simulateAnnualPlan(state: GameState, plan: AnnualPlan, now: number): PlanOutcome {
  const rich = { ...state, school: { ...state.school, euros: SIMULATION_FUNDS } };
  return applyPlan(rich, plan, now);
}

/** Cost of one more course on this Forma after the plan; undefined if nobody can take it. */
export function getNextCourseCost(simulated: GameState, formId: FormId, track: QuickTrainingKind, now: number): number | undefined {
  const candidate = getTeacherCourseCandidates(simulated, formId, track)[0];
  if (!candidate) return undefined;
  const after = startTeacherCourse(simulated, candidate.id, formId, track, now);
  return after === simulated ? undefined : roundCurrency(simulated.school.euros - after.school.euros);
}

export function getFullRepairCost(state: GameState): number {
  return getEquipmentMaintenanceCost(state.equipment);
}

export function getPlanSwordPrice(state: GameState): number {
  return getOfficialSwordUnitCost(state);
}

/** Next school year, month by month (September … August): income expected. */
export interface AnnualForecast {
  months: { month: number; income: number }[];
  total: number;
  /** Average month of the year just closed. */
  lastAverage: number;
  /** Change against the year just closed, as a fraction (0.24 = +24%). */
  change: number;
}

/**
 * Forecast from the year just closed (Andrea, 08/10): the level of its last
 * months (or today's monthly income, if higher) times each month's weight in it.
 * ponytail: a seasonal average, not a model of growth; refine if it misleads.
 */
export function getAnnualForecast(state: GameState): AnnualForecast {
  const months = state.annual?.report?.months ?? state.annual?.ledger?.months ?? [];
  const average = months.length ? months.reduce((sum, month) => sum + month.earned, 0) / months.length : 0;
  const recentMonths = months.slice(-3);
  const recent = Math.max(
    recentMonths.length ? recentMonths.reduce((sum, month) => sum + month.earned, 0) / recentMonths.length : 0,
    getMonthlyOperationalIncome(state),
  );
  const byCalendarMonth = new Map(months.map((month) => [getCalendarMonth(month.month), month.earned]));
  const firstMonth = getSchoolYearStartMonth(getSchoolYear(state.school.currentMonth) + 1);
  const forecast = Array.from({ length: 12 }, (_, index) => {
    const month = firstMonth + index;
    const past = byCalendarMonth.get(getCalendarMonth(month));
    const weight = average > 0 && past !== undefined ? past / average : 1;
    return { month, income: Math.round(recent * weight) };
  });
  const total = roundCurrency(forecast.reduce((sum, month) => sum + month.income, 0));
  return {
    months: forecast,
    total,
    lastAverage: average,
    change: average > 0 ? total / (average * 12) - 1 : 0,
  };
}

/** New capital the plan may borrow: owed with interest ≤ next year's forecast. 0 without «Anticipo di cassa». */
export function getDebtCapacity(state: GameState, forecastTotal = getAnnualForecast(state).total): number {
  const rate = getCashAdvanceRate(state.upgrades);
  if (rate === undefined || isDebtBlocked(state)) return 0;
  return Math.max(0, roundCurrency((forecastTotal - getDebtTotal(state)) / (1 + rate)));
}

/** «Conferma il piano»: the planned voci become real, the shortfall becomes debt, the game goes on. */
export function confirmAnnualPlan(state: GameState, plan: AnnualPlan, now: number): GameState {
  const annual = state.annual;
  if (!annual?.planningOpen) return state;
  const euros = state.school.euros;
  const simulated = simulateAnnualPlan(state, plan, now);
  const shortfall = Math.max(0, roundCurrency(simulated.cost - Math.max(0, euros)));
  if (shortfall > getDebtCapacity(state) + 0.01) return state;

  const funded = { ...state, school: { ...state.school, euros: euros + shortfall } };
  const applied = applyPlan(funded, plan, now);
  const left = roundCurrency(euros - applied.cost);
  const borrowed = Math.max(0, -left);
  let next: GameState = {
    ...applied.state,
    school: { ...applied.state.school, euros: borrowed > 0 ? Math.min(0, euros) : left },
  };
  next = addDebt(next, borrowed, getSchoolYearStartMonth(getSchoolYear(state.school.currentMonth) + 1));
  const summary: AnnualPlanSummary = {
    courses: applied.items.flatMap((item) => item.kind === "course" && item.formId && item.track
      ? [{ formId: item.formId, track: item.track, count: item.count }]
      : []),
    repaired: applied.items.some((item) => item.kind === "repair"),
    swordsBought: applied.items.find((item) => item.kind === "swords")?.count ?? 0,
    spent: applied.cost,
    borrowed,
  };
  return {
    ...next,
    annual: {
      ...annual,
      planningOpen: false,
      ...(annual.report ? { report: { ...annual.report, plan: summary } } : {}),
    },
  };
}
