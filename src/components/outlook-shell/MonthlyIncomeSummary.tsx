import { useId } from "react";
import { getEstimatedMonthlyGadgetIncome } from "../../game/gadgetIncomeEstimate";
import { getMonthlyMemberFees } from "../../game/membershipEconomy";
import { getMonthlySocialIncome } from "../../game/social";
import { useGameSelector } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";
import { Icon } from "../common/Icon";

interface MonthlyIncomePresentation {
  memberFees: number;
  socialIncome: number;
  gadgetIncome: number;
  gadgetUnlocked: boolean;
}

function selectMonthlyIncomePresentation(state: GameState): MonthlyIncomePresentation {
  return {
    memberFees: getMonthlyMemberFees(state),
    socialIncome: getMonthlySocialIncome(state),
    gadgetIncome: getEstimatedMonthlyGadgetIncome(state),
    gadgetUnlocked: state.unlocks.gadget,
  };
}

function isSameMonthlyIncomePresentation(
  left: MonthlyIncomePresentation,
  right: MonthlyIncomePresentation,
): boolean {
  return left.memberFees === right.memberFees &&
    left.socialIncome === right.socialIncome &&
    left.gadgetIncome === right.gadgetIncome &&
    left.gadgetUnlocked === right.gadgetUnlocked;
}

export function MonthlyIncomeSummary({ state: stateOverride }: { state?: GameState }) {
  const tooltipId = useId();
  const {
    memberFees,
    socialIncome,
    gadgetIncome,
    gadgetUnlocked,
  } = useGameSelector(
    selectMonthlyIncomePresentation,
    stateOverride,
    isSameMonthlyIncomePresentation,
  );
  const monthlyIncome = memberFees + socialIncome + gadgetIncome;

  return (
    <div className="title-monthly-income">
      <span
        tabIndex={0}
        className="title-resource title-monthly-income-trigger"
        aria-label={`Entrate mensili: ${formatCurrency(monthlyIncome)}`}
        aria-describedby={tooltipId}
      >
        <Icon name="trend" />
        <small>Entrate mensili</small>
        <strong>{formatCurrency(monthlyIncome)}</strong>
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
        </dl>
      </div>
    </div>
  );
}
