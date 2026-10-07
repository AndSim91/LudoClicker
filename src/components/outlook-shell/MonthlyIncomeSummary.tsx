import { getNetworkSponsorIncome } from "../../content/upgrades";
import { useId } from "react";
import { getEstimatedMonthlyGadgetIncome } from "../../game/gadgetIncomeEstimate";
import { getMonthlyDepositInterest, getMonthlyMembershipIncome } from "../../game/membershipEconomy";
import { getMonthlyNetworkRent } from "../../game/reputation";
import { getMonthlySocialIncome } from "../../game/social";
import { useGameSelector } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { formatCompactCurrency } from "./resourceFormatting";

interface MonthlyIncomePresentation {
  memberFees: number;
  socialIncome: number;
  gadgetIncome: number;
  gadgetUnlocked: boolean;
  networkRent: number;
  depositInterest: number;
  networkSponsor: number;
}

function selectMonthlyIncomePresentation(state: GameState): MonthlyIncomePresentation {
  return {
    memberFees: getMonthlyMembershipIncome(state),
    socialIncome: getMonthlySocialIncome(state),
    gadgetIncome: getEstimatedMonthlyGadgetIncome(state),
    gadgetUnlocked: state.unlocks.gadget,
    networkRent: getMonthlyNetworkRent(state),
    depositInterest: getMonthlyDepositInterest(state),
    networkSponsor: getNetworkSponsorIncome(state.upgrades, state.network.schoolCount),
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
    left.networkSponsor === right.networkSponsor;
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
  } = useGameSelector(
    selectMonthlyIncomePresentation,
    stateOverride,
    isSameMonthlyIncomePresentation,
  );
  const monthlyIncome = memberFees + socialIncome + gadgetIncome + networkRent + depositInterest + networkSponsor;

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
            <dd>{formatCurrency(memberFees)}</dd>
          </div>
          <div>
            <dt>Bonus Social</dt>
            <dd>{formatCurrency(socialIncome)}</dd>
          </div>
          {gadgetUnlocked ? (
            <div>
              <dt>Vendite Gadget (stima)</dt>
              <dd>{formatCurrency(gadgetIncome)}</dd>
            </div>
          ) : null}
          {networkRent > 0 ? (
            <div>
              <dt>Rete delle Onde</dt>
              <dd>{formatCurrency(networkRent)}</dd>
            </div>
          ) : null}
          {networkSponsor > 0 ? (
            <div>
              <dt>Sponsor nazionale</dt>
              <dd>{formatCurrency(networkSponsor)}</dd>
            </div>
          ) : null}
          {depositInterest > 0 ? (
            <div>
              <dt>Conto deposito</dt>
              <dd>{formatCurrency(depositInterest)}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
