import { useId, useMemo } from "react";
import { getEstimatedMonthlyGadgetIncome } from "../../game/gadgetIncomeEstimate";
import { getMonthlyMemberFees } from "../../game/membershipEconomy";
import { getMonthlySocialIncome } from "../../game/social";
import { useGameStateSlices } from "../../game/GameStateContext";
import type { GameState } from "../../game/types";
import { formatCurrency } from "../../shared/formatters";

export function MonthlyIncomeSummary({ state: stateOverride }: { state?: GameState }) {
  const state = useGameStateSlices(
    [
      "collaboratorManagement",
      "collaborators",
      "contacts",
      "gadgets",
      "school",
      "unlocks",
      "upgrades",
    ],
    stateOverride,
  );
  const tooltipId = useId();
  const memberFees = getMonthlyMemberFees(state);
  const socialIncome = getMonthlySocialIncome(state);
  const gadgetIncome = useMemo(
    () => getEstimatedMonthlyGadgetIncome(state),
    [state],
  );
  const monthlyIncome = memberFees + socialIncome + gadgetIncome;

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
          {state.unlocks.gadget ? (
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
