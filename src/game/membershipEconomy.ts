import { getNetworkSponsorIncome, getUpgradeEffectTotal } from "../content/upgrades";
import { GAME_CONFIG } from "./config";
import { roundCurrency } from "./economy";
import { getMonthlyNetworkRent } from "./reputation";
import { getMonthlySocialIncome } from "./social";
import type { GameState } from "./types";

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
  return roundCurrency(Math.min(Math.max(0, state.school.euros), DEPOSIT_INTEREST_FUNDS_CAP) * rate);
}

export function getMonthlyOperationalIncome(state: GameState): number {
  // Rents of the schools in the network are fixed: no multiplier touches them.
  return getMonthlyMembershipIncome(state) + getMonthlyNetworkRent(state) +
    getMonthlySocialIncome(state) + getMonthlyDepositInterest(state) +
    getNetworkSponsorIncome(state.upgrades, state.network.schoolCount);
}
