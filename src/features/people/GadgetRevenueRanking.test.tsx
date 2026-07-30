import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialGadgetMonthlyRevenueState } from "../../game/gadgetRevenue";
import { GadgetRevenueRanking } from "./GadgetRevenueRanking";

afterEach(cleanup);

describe("GadgetRevenueRanking", () => {
  it("ordina i prodotti per ricavi mensili e mette in evidenza il leader", () => {
    const monthlyRevenue = createInitialGadgetMonthlyRevenueState(9);
    monthlyRevenue.totals = {
      mug: 4_820,
      hoodie: 4_120,
      tshirt: 2_310,
      underwear: 1_480,
      wristband: 1_120,
    };

    render(
      <GadgetRevenueRanking
        monthlyRevenue={monthlyRevenue}
        currentMonth={9}
        mastery={<span>Maestro</span>}
      />,
    );

    expect(screen.getByText("Classifica ricavi")).toBeVisible();
    expect(screen.getByText("Maestro")).toBeVisible();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("1Tazza4.820 €34,8%Leader");
    expect(rows[1]).toHaveTextContent("2Felpa4.120 €29,7%");
    expect(rows[2]).toHaveTextContent("3Maglietta2.310 €16,7%");
    expect(rows[3]).toHaveTextContent("4Mutande1.480 €10,7%");
    expect(rows[4]).toHaveTextContent("5Polsino1.120 €8,1%");
    expect(within(rows[0]).getByRole("progressbar", {
      name: "Quota ricavi Tazza",
    })).toHaveValue(4_820 / 13_850 * 100);
  });

  it("non assegna un leader prima della prima vendita del mese", () => {
    render(
      <GadgetRevenueRanking
        monthlyRevenue={createInitialGadgetMonthlyRevenueState(9)}
        currentMonth={9}
        mastery={<span>Principiante</span>}
      />,
    );

    expect(screen.queryByText("Leader")).not.toBeInTheDocument();
    expect(screen.getAllByText("0,0%")).toHaveLength(5);
  });
});
