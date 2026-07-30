import { GADGET_DEFINITIONS, GADGET_PRODUCT_ORDER } from "../../content/gadgets";
import type { GadgetMonthlyRevenueState, GadgetProductId } from "../../game/types";
import type { ReactNode } from "react";

const RANKING_PRODUCT_ORDER: readonly GadgetProductId[] = [
  "mug",
  "hoodie",
  "tshirt",
  "underwear",
  "wristband",
];

function formatRevenue(value: number): string {
  const rounded = Math.max(0, Math.round(value));
  return `${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;
}

function formatShare(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

export function GadgetRevenueRanking({
  monthlyRevenue,
  currentMonth,
  mastery,
}: {
  monthlyRevenue: GadgetMonthlyRevenueState;
  currentMonth: number;
  mastery: ReactNode;
}) {
  const totals = monthlyRevenue.month === currentMonth
    ? monthlyRevenue.totals
    : Object.fromEntries(
        GADGET_PRODUCT_ORDER.map((productId) => [productId, 0]),
      ) as GadgetMonthlyRevenueState["totals"];
  const catalogRevenue = RANKING_PRODUCT_ORDER.reduce(
    (total, productId) => total + totals[productId],
    0,
  );
  const ranking = [...RANKING_PRODUCT_ORDER].sort((left, right) =>
    totals[right] - totals[left] ||
    RANKING_PRODUCT_ORDER.indexOf(left) - RANKING_PRODUCT_ORDER.indexOf(right)
  );
  const leader = catalogRevenue > 0 ? ranking[0] : null;

  return (
    <section
      className="gadget-ranking-body"
      aria-label="Classifica ricavi Gadget del mese"
    >
      <div className="gadget-ranking-heading">
        <span>
          <strong>Classifica ricavi</strong>
          <small>Mese in corso</small>
        </span>
        {mastery}
      </div>

      <ol className="gadget-ranking-list">
        {ranking.map((productId, index) => {
          const revenue = totals[productId];
          const share = catalogRevenue > 0 ? revenue / catalogRevenue * 100 : 0;
          const isLeader = productId === leader;
          return (
            <li className={isLeader ? "is-leader" : undefined} key={productId}>
              <span className="gadget-ranking-position">{index + 1}</span>
              <strong className="gadget-ranking-name">
                {GADGET_DEFINITIONS[productId].name}
              </strong>
              <b className="gadget-ranking-revenue">{formatRevenue(revenue)}</b>
              <progress
                className="gadget-ranking-progress"
                max={100}
                value={share}
                aria-label={`Quota ricavi ${GADGET_DEFINITIONS[productId].name}`}
              />
              <strong className="gadget-ranking-share">{formatShare(share)}</strong>
              <span className="gadget-ranking-status">
                {isLeader ? "Leader" : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
