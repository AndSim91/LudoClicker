import { useId } from "react";
import { getMonthlyMemberFees } from "../../game/membershipEconomy";
import { getMonthlySocialIncome } from "../../game/social";
import type { GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";

export function MonthlyIncomeSummary({ state }: { state: GameState }) {
  const tooltipId = useId();
  const memberFees = getMonthlyMemberFees(state);
  const socialIncome = getMonthlySocialIncome(state);
  const monthlyIncome = memberFees + socialIncome;

  return (
    <div className="people-monthly-income">
      <button
        type="button"
        className="people-monthly-income-trigger"
        aria-label={`Guadagno al mese: ${formatCurrency(monthlyIncome)}`}
        aria-describedby={tooltipId}
      >
        <strong>{formatCurrency(monthlyIncome)}</strong>
        <small>al mese</small>
      </button>
      <div className="people-monthly-income-tooltip" id={tooltipId} role="tooltip">
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
        </dl>
      </div>
    </div>
  );
}
