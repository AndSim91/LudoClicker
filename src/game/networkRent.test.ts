import { expect, it } from "vitest";
import { addAdminMembers } from "./adminFlow";
import { createInitialState } from "./engine";
import { getMonthlyMemberFees, getMonthlyOperationalIncome } from "./membershipEconomy";
import { getFoundationRentPreview, getMonthlyNetworkRent } from "./networkRent";
import { migrate } from "./saveMigrations";
import type { FoundedSchool, GameState } from "./types";

const school = (monthlyRent?: number): FoundedSchool => ({
  id: `school-${monthlyRent}`,
  name: "Ordine delle Onde",
  city: "Genova",
  motto: "",
  specialization: "generale",
  membersAtTransfer: 100,
  emailsSent: 0,
  eventsCompleted: 0,
  transferredAt: 0,
  ...(monthlyRent === undefined ? {} : { monthlyRent }),
});

it("prices the rent at 25% of the fees, +25 points each for Champion's, Reptile/Superba and Chronicles", () => {
  const initial = addAdminMembers(createInitialState(1_000, "Tester"), 40);
  const fees = getMonthlyMemberFees(initial);
  const titled = { ...initial, tournaments: { ...initial.tournaments, nationalTitlesCurrentSchool: 3 } };
  // The national titles are the requirement, not a bonus.
  expect(getFoundationRentPreview(titled).rent).toBe(Math.round(fees * 0.25));

  const win = (superba: boolean) => ({ schoolYear: 2, teamId: "home", schoolName: initial.school.name, athleteNames: ["A", "B"] as [string, string], superba });
  const decorated: GameState = {
    ...titled,
    tournaments: {
      ...titled.tournaments,
      championsVictoryCurrentSchool: true,
      chroniclesVictoryCurrentSchool: true,
      reptile: { ...initial.tournaments.reptile, hall: [win(false), win(true), win(true)] },
    },
  };
  const preview = getFoundationRentPreview(decorated);
  expect(preview.share).toBeCloseTo(1);
  expect(preview.reptileWin).toBe("superba");
  expect(preview.rent).toBe(Math.round(fees));
});

it("adds the fixed rents to the monthly income without multipliers", () => {
  const initial = createInitialState(1_000, "Tester");
  const withNetwork = {
    ...initial,
    network: { ...initial.network, schools: [school(900), school(300)] },
  };
  expect(getMonthlyNetworkRent(withNetwork)).toBe(1_200);
  expect(getMonthlyOperationalIncome(withNetwork) - getMonthlyOperationalIncome(initial)).toBe(1_200);
});

it("gives older founded schools a rent from their members at transfer", () => {
  const initial = createInitialState(1_000, "Tester");
  const saved = { ...initial, version: 84, network: { ...initial.network, schools: [school()] } };
  expect((migrate(saved) as GameState).network.schools[0].monthlyRent).toBe(1_000);
});
