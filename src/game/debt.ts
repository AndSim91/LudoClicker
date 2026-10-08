import { getUpgradeEffectTotal } from "../content/upgrades";
import { getGameMonthName } from "./calendar";
import { formatCurrency } from "../shared/formatters";
import { roundCurrency } from "./economy";
import { addMessage } from "./stateUpdates";
import type { GameState, SchoolDebt, UpgradeLevels } from "./types";

/*
 * Debito della Pianificazione delle Onde (Andrea, 08/10). Only the Pianificazione
 * can spend beyond the Fondi, with «Anticipo di cassa». The capital plus the
 * lender's interest is paid back in 12 monthly installments from September;
 * if the debt grows, or the rate improves, the installment is recomputed on
 * what is left. After the 12 months, while something is still owed, paid
 * events, courses (Allievi, Istruttori, Tecnici) and sword purchases stop;
 * repairs and free events stay open.
 */

export const DEBT_INSTALLMENTS = 12;
/** Interest per level of «Anticipo di cassa»: 20% → 5% in five steps. */
const LENDER_RATES = [0.2, 0.1625, 0.125, 0.0875, 0.05] as const;

/** Interest rate of the current lender; undefined without «Anticipo di cassa». */
export function getCashAdvanceRate(upgrades: UpgradeLevels): number | undefined {
  const level = Math.floor(getUpgradeEffectTotal(upgrades, "cashAdvanceLevel"));
  return level > 0 ? LENDER_RATES[Math.min(level, LENDER_RATES.length) - 1] : undefined;
}

function rateOf(state: Pick<GameState, "upgrades">): number {
  // ponytail: a debt without the upgrade (admin, old save) pays the worst rate.
  return getCashAdvanceRate(state.upgrades) ?? LENDER_RATES[0];
}

/** What is still owed, interest included. */
export function getDebtTotal(state: Pick<GameState, "debt" | "upgrades">): number {
  return state.debt ? roundCurrency(state.debt.principal * (1 + rateOf(state))) : 0;
}

/** This month's installment: the rest split over the months left, all of it once overdue. */
export function getDebtInstallment(state: Pick<GameState, "debt" | "upgrades">): number {
  if (!state.debt) return 0;
  return roundCurrency(getDebtTotal(state) / Math.max(1, state.debt.monthsLeft));
}

/** Twelve months passed and something is still owed. */
export function isDebtBlocked(state: Pick<GameState, "debt">): boolean {
  return Boolean(state.debt && state.debt.monthsLeft <= 0 && state.debt.principal > 0);
}

/** Fondi usable for paid events, courses and swords: none while the debt is overdue. */
export function getSpendableEuros(state: Pick<GameState, "debt" | "school">): number {
  return isDebtBlocked(state) ? 0 : state.school.euros;
}

/** New capital borrowed in the Pianificazione: the 12 installments start again from `firstMonth`. */
export function addDebt(state: GameState, principal: number, firstMonth: number): GameState {
  if (!(principal > 0)) return state;
  const debt: SchoolDebt = {
    principal: roundCurrency((state.debt?.principal ?? 0) + principal),
    monthsLeft: DEBT_INSTALLMENTS,
    firstMonth,
  };
  return { ...state, debt };
}

/** At the end of `month` (before the month advances): one installment from the Fondi. */
export function payDebtInstallment(state: GameState, month: number, now: number): GameState {
  const debt = state.debt;
  if (!debt || month < debt.firstMonth) return state;
  const rate = rateOf(state);
  const paid = Math.min(getDebtInstallment(state), Math.max(0, state.school.euros));
  const principal = roundCurrency(debt.principal - paid / (1 + rate));
  const monthsLeft = Math.max(0, debt.monthsLeft - 1);
  const school = { ...state.school, euros: roundCurrency(state.school.euros - paid) };
  if (principal <= 0.01) {
    const cleared = { ...state, school };
    delete cleared.debt;
    return addMessage(
      cleared,
      now,
      "Debito saldato",
      "L'ultima rata è pagata: la scuola non deve più niente a nessuno.",
      "positive",
    );
  }
  const next: GameState = { ...state, school, debt: { ...debt, principal, monthsLeft } };
  return debt.monthsLeft > 0 && monthsLeft === 0
    ? addMessage(
        next,
        now,
        "Debito scaduto",
        `Dopo 12 rate restano da pagare ${formatCurrency(getDebtTotal(next))}. ` +
          `Da ${getGameMonthName(month + 1).toLowerCase()} si fermano eventi a pagamento, corsi e acquisto di spade finché il debito non è saldato.`,
        "system",
      )
    : next;
}
