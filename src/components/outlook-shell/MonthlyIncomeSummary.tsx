import { getFundsGainMultiplier, getNetworkSponsorIncome } from "../../content/upgrades";
import { useId } from "react";
import { getEstimatedMonthlyGadgetIncome } from "../../game/gadgetIncomeEstimate";
import { getMonthlyDepositInterest, getMonthlyMembershipIncome, getMonthlySponsorIncome } from "../../game/membershipEconomy";
import { getBusinessMultiplier, getMonthlyNetworkRent } from "../../game/reputation";
import { getMonthlySocialIncome } from "../../game/social";
import { useGameSelector } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";
import { formatCurrency, formatWholeCurrency } from "../../shared/formatters";
import { formatCompactCurrency } from "./resourceFormatting";

interface MonthlyIncomePresentation {
  memberFees: number;
  socialIncome: number;
  gadgetIncome: number;
  gadgetUnlocked: boolean;
  networkRent: number;
  depositInterest: number;
  networkSponsor: number;
  sponsors: number;
}

function selectMonthlyIncomePresentation(state: GameState): MonthlyIncomePresentation {
  // «Il tempo è denaro» 5 (+10% on the Fondi earned), as in the real monthly income (15/10/2026).
  // The Gadget estimate plays the real sales, so it already has it.
  const funds = getFundsGainMultiplier(state.upgrades);
  return {
    memberFees: getMonthlyMembershipIncome(state) * funds,
    socialIncome: getMonthlySocialIncome(state) * funds,
    gadgetIncome: getEstimatedMonthlyGadgetIncome(state),
    gadgetUnlocked: state.unlocks.gadget,
    networkRent: getMonthlyNetworkRent(state) * getBusinessMultiplier(state) * funds,
    depositInterest: getMonthlyDepositInterest(state) * funds,
    networkSponsor: getNetworkSponsorIncome(state.upgrades, state.network.schoolCount) *
      getBusinessMultiplier(state) * funds,
    sponsors: getMonthlySponsorIncome(state) * funds,
  };
}

function isSameMonthlyIncomePresentation(
  left: MonthlyIncomePresentation,
  right: MonthlyIncomePresentation,
): boolean {
  return left.memberFees === right.memberFees &&
    left.socialIncome === right.socialIncome &&
    left.gadgetIncome === right.gadgetIncome &&
    left.gadgetUnlocked === right.gadgetUnlocked &&
    left.networkRent === right.networkRent &&
    left.depositInterest === right.depositInterest &&
    left.networkSponsor === right.networkSponsor &&
    left.sponsors === right.sponsors;
}

export function MonthlyIncomeSummary({ state: stateOverride }: { state?: GameState }) {
  const tooltipId = useId();
  const {
    memberFees,
    socialIncome,
    gadgetIncome,
    gadgetUnlocked,
    networkRent,
    depositInterest,
    networkSponsor,
    sponsors,
  } = useGameSelector(
    selectMonthlyIncomePresentation,
    stateOverride,
    isSameMonthlyIncomePresentation,
  );
  const monthlyIncome = memberFees + socialIncome + gadgetIncome + networkRent + depositInterest + networkSponsor + sponsors;

  return (
    <div className="title-monthly-income">
      <span
        tabIndex={0}
        className="title-resource title-monthly-income-trigger"
        aria-label={`Entrate mensili: ${formatCurrency(monthlyIncome)}`}
        aria-describedby={tooltipId}
      >
        <strong>+{formatCompactCurrency(monthlyIncome)}</strong>
        <small>al mese</small>
      </span>
      <div className="title-monthly-income-tooltip" id={tooltipId} role="tooltip">
        <p>Dettaglio mensile</p>
        <dl>
          <div>
            <dt>Quote iscritti</dt>
            <dd>{formatWholeCurrency(memberFees)}</dd>
          </div>
          <div>
            <dt>Bonus Social</dt>
            <dd>{formatWholeCurrency(socialIncome)}</dd>
          </div>
          {gadgetUnlocked ? (
            <div>
              <dt>Vendite Gadget (stima)</dt>
              <dd>{formatWholeCurrency(gadgetIncome)}</dd>
            </div>
          ) : null}
          {networkRent > 0 ? (
            <div>
              <dt>Network delle Onde</dt>
              <dd>{formatWholeCurrency(networkRent)}</dd>
            </div>
          ) : null}
          {sponsors > 0 ? (
            <div>
              <dt>Sponsor della fascia LED</dt>
              <dd>{formatWholeCurrency(sponsors)}</dd>
            </div>
          ) : null}
          {networkSponsor > 0 ? (
            <div>
              <dt>Sponsor nazionale</dt>
              <dd>{formatWholeCurrency(networkSponsor)}</dd>
            </div>
          ) : null}
          {depositInterest > 0 ? (
            <div>
              <dt>Conto deposito</dt>
              <dd>{formatWholeCurrency(depositInterest)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
