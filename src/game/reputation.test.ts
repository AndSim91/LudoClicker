import { expect, it } from "vitest";
import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import { getDiscoveredLegendaryIds } from "../features/ludowiki/ludodexPresentation";
import { addAdminMembers } from "./adminFlow";
import { createAcquiredContacts } from "./contacts";
import { createInitialState } from "./engine";
import { getMonthlyMemberFees, getMonthlyOperationalIncome } from "./membershipEconomy";
import {
  getMonthlyNetworkRent,
  getPrestigeReputationPreview,
  getReputationMultiplier,
} from "./reputation";
import { getEmailBookingChance, getEnrollmentChance, getWritingPower } from "./formulas";
import { foundSchool } from "./schoolProgressionFlow";
import { getTrainingDurationMultiplier } from "./teacherTrainingFlow";
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

const details = { name: "Ordine del Faro", city: "Trieste", accentColor: "#7652b3", motto: "", specialization: "redazione" as const };

/** A school of 125 members, 10.000 Fama and a national title: ready to found. */
function readySchool(base: GameState = createInitialState(1_000, "Tester")): GameState {
  const withMembers = addAdminMembers(base, 125 - base.school.activeMembers);
  return {
    ...withMembers,
    school: { ...withMembers.school, fame: 10_000 },
    tournaments: { ...withMembers.tournaments, nationalTitlesCurrentSchool: 1 },
  };
}

it("earns 1 point for the national title, half of √(Fama/100), +1 for each kind of tournament won", () => {
  const ready = readySchool();
  expect(getPrestigeReputationPreview(ready)).toMatchObject({ famePoints: 5, points: 6, rentPerPoint: 50 });
  // Founding as soon as possible still earns the point of the national title.
  expect(getPrestigeReputationPreview({ ...ready, school: { ...ready.school, fame: 200 } }).points).toBe(1);

  const win = { schoolYear: 2, teamId: "home", schoolName: ready.school.name, athleteNames: ["A", "B"] as [string, string], superba: true };
  const decorated: GameState = {
    ...ready,
    tournaments: {
      ...ready.tournaments,
      championsVictoryCurrentSchool: true,
      chroniclesVictoryCurrentSchool: true,
      reptile: { ...ready.tournaments.reptile, hall: [win, win] },
    },
  };
  expect(getPrestigeReputationPreview(decorated)).toMatchObject({ points: 9, reptileWin: "superba" });
});

it("spends points for good: permanent upgrades stay, rent points only lock this school's rent", () => {
  const first = foundSchool(readySchool(), details, 2_000, { upgrades: { writing: 2 }, rent: 4 });
  expect(first.network.reputation).toBe(0);
  expect(first.network.reputationUpgrades?.writing).toBe(2);
  expect(getReputationMultiplier(first, "writing")).toBeCloseTo(1.2);
  expect(first.player.writingPower).toBeCloseTo(1.2);
  // 125 members × 40 € × 10% = 500 € of rent value; 4 points = 40% = 200 €.
  expect(first.network.schools[0].monthlyRent).toBe(200);
  expect(first.school.fame).toBe(0);

  // The next school starts again from 0% rent: 5 more points add 50% of its own value.
  const second = foundSchool(readySchool(first), details, 3_000, { upgrades: {}, rent: 5 });
  expect(second.network.schools.map((entry) => entry.monthlyRent)).toEqual([200, 250]);
  expect(second.network.reputationUpgrades?.writing).toBe(2);

  // No rent points: no new rent, the old ones stay.
  const third = foundSchool(readySchool(second), details, 4_000);
  expect(getMonthlyNetworkRent(third)).toBe(450);
  expect(third.network.reputation).toBe(7);
});

it("refuses the foundation when the spending is not covered or exceeds a cap", () => {
  const ready = readySchool();
  expect(foundSchool(ready, details, 2_000, { upgrades: {}, rent: 7 })).toBe(ready);
  expect(foundSchool(ready, details, 2_000, { upgrades: { training: -1 }, rent: 0 })).toBe(ready);
  const nearlyMaxed = {
    ...ready,
    network: { ...ready.network, reputation: 10, reputationUpgrades: { enrollment: 48 } },
  };
  expect(foundSchool(nearlyMaxed, details, 2_000, { upgrades: { enrollment: 3 }, rent: 0 })).toBe(nearlyMaxed);
  // The rent has no cap: it is where the reputation goes once the upgrades are full.
  expect(foundSchool(nearlyMaxed, details, 2_000, { upgrades: {}, rent: 15 }).network.schools[0].monthlyRent).toBe(750);
});

it("adds the fixed rents to the monthly income without multipliers", () => {
  const initial = createInitialState(1_000, "Tester");
  const withNetwork = {
    ...initial,
    network: { ...initial.network, schools: [school(900), school(300)], reputationUpgrades: { membershipFees: 10 } },
  };
  expect(getMonthlyNetworkRent(withNetwork)).toBe(1_200);
  expect(getMonthlyOperationalIncome(withNetwork) - getMonthlyOperationalIncome(initial)).toBe(1_200);
});

it("turns the old reputation into points and stops the automatic rents (v86)", () => {
  const initial = createInitialState(1_000, "Tester");
  const saved = { ...initial, version: 85, network: { ...initial.network, reputation: 4, reputationUpgrades: undefined, schools: [school(1_000)] } };
  const migrated = migrate(saved) as GameState;
  expect(migrated.version).toBe(86);
  expect(migrated.network.reputation).toBe(4);
  expect(migrated.network.reputationUpgrades).toEqual({});
  expect(migrated.network.schools[0].monthlyRent).toBe(0);
  expect(migrated.school.fame).toBe(initial.school.fame);
});

it("raises the base values by 10% a point, probabilities up to their maximum", () => {
  const initial = createInitialState(1_000, "Tester");
  const boosted = (levels: GameState["network"]["reputationUpgrades"]): GameState => ({
    ...initial,
    network: { ...initial.network, reputationUpgrades: levels },
  });
  const levelled = boosted({ writing: 5, trialBooking: 5, enrollment: 2, training: 10 });

  expect(getWritingPower(levelled)).toBeCloseTo(getWritingPower(initial) * 1.5);
  // Common: 40% booking base × 1.5 = 60%; 62.5% enrollment base × 1.2 = 75%.
  expect(getEmailBookingChance(levelled, "common")).toBeCloseTo(0.6);
  expect(getEnrollmentChance(levelled, "common")).toBeCloseTo(0.75);
  expect(getEmailBookingChance(boosted({ trialBooking: 50 }), "common")).toBeCloseTo(0.85);
  expect(getEnrollmentChance(boosted({ enrollment: 50 }), "common")).toBeCloseTo(1);

  const course = { formId: "form-1" as const, startedAt: 0, completesAt: 0 };
  expect(getTrainingDurationMultiplier(levelled, "x", course)).toBeCloseTo(
    getTrainingDurationMultiplier(initial, "x", course) / 2,
  );
  // Courses of the staff are not students' courses.
  const instructorCourse = { ...course, trainingTrack: "instructor" as const };
  expect(getTrainingDurationMultiplier(levelled, "x", instructorCourse)).toBeCloseTo(
    getTrainingDurationMultiplier(initial, "x", instructorCourse),
  );

  const withMembers = addAdminMembers(initial, 50);
  const feesUp = { ...withMembers, network: { ...withMembers.network, reputationUpgrades: { membershipFees: 3 } } };
  // Only the member fees grow, not the Social income.
  expect(getMonthlyOperationalIncome(feesUp) - getMonthlyOperationalIncome(withMembers))
    .toBeCloseTo(getMonthlyMemberFees(withMembers) * 0.3);
});

it("lets a secret legendary recruited before join the ordinary legendaries of the next schools", () => {
  const initial = createInitialState(1_000, "Tester");
  const retained = { forms: ["form-1" as const], instructorForms: [], technicianForms: [], formBranchPreferences: [], joinedAt: 0, arenaBase: 140, styleBase: 150 };
  const state: GameState = {
    ...initial,
    legendaryCollaborators: {
      ...initial.legendaryCollaborators,
      // Every ordinary legendary is busy: the only free one is the secret Marco Palena.
      enrolledProfileIds: SPECIAL_COLLABORATORS.map((profile) => profile.id),
      retainedProgress: { "marco-palena": retained },
    },
  };
  const [contact] = createAcquiredContacts(state, 1, "event", 2_000, { forcedRarity: "legendary" }).contacts;
  expect(contact).toMatchObject({
    firstName: "Marco",
    lastName: "Palena",
    rarity: "legendary",
    specialProfileId: "marco-palena",
    secretLegendaryId: "marco-palena",
    arenaBase: 140,
    styleBase: 150,
  });
  // The Ludodex remembers it after the prestige too.
  expect(getDiscoveredLegendaryIds({ legendaryCollaborators: { ...state.legendaryCollaborators, enrolledProfileIds: [] } }))
    .toContain("marco-palena");
});
