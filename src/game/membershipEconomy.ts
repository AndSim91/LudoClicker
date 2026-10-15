import { getFundsGainMultiplier, getNetworkSponsorIncome, getSponsorIncome, getUpgradeEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import { getBusinessMultiplier, getMonthlyNetworkRent } from "./reputation";
import { getMonthlySocialIncome } from "./social";
import type { GameState, IncomeSource, Statistics } from "./types";

/** Base fee per member, set by the record of active members of the current school. */
export function getMemberFee(peakActiveMembers: number): number {
  let fee: number = GAME_CONFIG.monthlyMemberFee;
  for (const tier of GAME_CONFIG.membershipFeeTiers) {
    if (peakActiveMembers >= tier.members) fee = tier.fee;
  }
  return fee;
}

export function getMonthlyMemberFees(state: GameState): number {
  return state.school.activeMembers * getMemberFee(state.school.peakActiveMembers);
}

/** Member fees with every multiplier from the school's upgrades. */
export function getMonthlyMembershipIncome(state: GameState): number {
  return getMonthlyMemberFees(state) *
    (1 + getUpgradeEffectTotal(state.upgrades, "membershipIncomeMultiplier") +
      getUpgradeEffectTotal(state.upgrades, "incomeMultiplier"));
}

const DEPOSIT_INTEREST_FUNDS_CAP = 250_000;

/** Conto deposito: monthly interest on the first 250.000 € of funds. */
export function getMonthlyDepositInterest(state: GameState): number {
  const rate = getUpgradeEffectTotal(state.upgrades, "depositInterestRate");
  if (rate <= 0) return 0;
  return roundCurrency(
    Math.min(Math.max(0, state.school.euros), DEPOSIT_INTEREST_FUNDS_CAP) * rate * getBusinessMultiplier(state),
  );
}

/** Adds euros earned to the per-source counters of the Report annuale. */
export function recordIncomeBySource(
  statistics: Statistics,
  parts: Partial<Record<IncomeSource, number>>,
): Statistics {
  const incomeBySource = { ...statistics.incomeBySource };
  for (const [source, euros] of Object.entries(parts) as [IncomeSource, number][]) {
    if (euros > 0) incomeBySource[source] = roundCurrency((incomeBySource[source] ?? 0) + euros);
  }
  return { ...statistics, incomeBySource };
}

/** Network rents and sponsors: fixed amounts, only Business Strategy raises them (15/10). */
export function getMonthlyNetworkIncome(state: GameState): number {
  return (getMonthlyNetworkRent(state) + getNetworkSponsorIncome(state.upgrades, state.network.schoolCount)) *
    getBusinessMultiplier(state);
}

/** Contratti di sponsorizzazione: the sponsors on the LED band pay by the Fama. */
export function getMonthlySponsorIncome(state: GameState): number {
  return getSponsorIncome(state.upgrades, state.school.fame);
}

/** The monthly income split by source. */
export function getMonthlyIncomeBySource(state: GameState): Partial<Record<IncomeSource, number>> {
  const bonus = getFundsGainMultiplier(state.upgrades);
  return {
    fees: getMonthlyMembershipIncome(state) * bonus,
    network: getMonthlyNetworkIncome(state) * bonus,
    social: getMonthlySocialIncome(state) * bonus,
    sponsors: getMonthlySponsorIncome(state) * bonus,
    deposit: getMonthlyDepositInterest(state) * bonus,
  };
}

export function getMonthlyOperationalIncome(state: GameState): number {
  // «Il tempo è denaro» 5 adds 10% to everything; Business Strategy is inside the parts.
  return (getMonthlyMembershipIncome(state) + getMonthlyNetworkIncome(state) +
    getMonthlySocialIncome(state) + getMonthlySponsorIncome(state) + getMonthlyDepositInterest(state)) *
    getFundsGainMultiplier(state.upgrades);
}
