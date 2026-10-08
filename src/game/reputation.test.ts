import { GAME_CONFIG } from "./config";
import { expect, it } from "vitest";
import { SPECIAL_COLLABORATORS } from "../content/specialCollaborators";
import { getDiscoveredLegendaryIds } from "../features/ludowiki/ludodexPresentation";
import { addAdminMembers } from "./adminFlow";
import { createAcquiredContacts } from "./contacts";
import { createInitialState } from "./engine";
import { getMonthlyMemberFees, getMonthlyOperationalIncome } from "./membershipEconomy";
import {
  addSchoolToMap,
  getMonthlyNetworkRent,
  getPrestigeReputationPreview,
  getReputationMultiplier,
} from "./reputation";
import { rollAthleteBaseStats } from "./athleteStats";
import { getEventContactMultiplier } from "./eventRewards";
import { getEmailBookingChance, getEnrollmentChance, getWritingPower } from "./formulas";
import { completeShortGoal, foundSchool } from "./schoolProgressionFlow";
import { getTrainingDurationMultiplier } from "./teacherTrainingFlow";
import { getMonthlySocialIncome } from "./social";
import { migrate } from "./saveMigrations";
import type { GameState } from "./types";

/** A school left behind as saved up to v90. */
const legacySchool = (monthlyRent?: number, name = "Ordine delle Onde") => ({
  id: `school-${monthlyRent}`,
  name,
  city: "Genova",
  motto: "",
  specialization: "generale",
  membersAtTransfer: 100,
  emailsSent: 0,
  eventsCompleted: 0,
  transferredAt: 0,
  ...(monthlyRent === undefined ? {} : { monthlyRent }),
});

const details = { name: "Ordine del Faro", city: "Trieste" };

/** A school of 125 members, 5.000 Fama, an Accademico and a national title: ready to found. */
function readySchool(base: GameState = createInitialState(1_000, "Tester")): GameState {
  const withMembers = addAdminMembers(base, 125 - base.school.activeMembers);
  return {
    ...withMembers,
    school: { ...withMembers.school, fame: 5_000 },
    tournaments: { ...withMembers.tournaments, academyTitlesCurrentSchool: 1, nationalTitlesCurrentSchool: 1 },
  };
}

it("earns 1 point for the Accademico, 2 for the National, √(Fama/128), +2 for each kind of tournament won", () => {
  const ready = readySchool();
  expect(getPrestigeReputationPreview(ready)).toMatchObject({ famePoints: 6, nationalWin: true, points: 9, rentPerPoint: 50 });
  // Founding as soon as possible still earns the point of the Accademico title.
  const academyOnly = { ...ready, tournaments: { ...ready.tournaments, nationalTitlesCurrentSchool: 0 } };
  expect(getPrestigeReputationPreview({ ...academyOnly, school: { ...ready.school, fame: 127 } }).points).toBe(1);
  expect(getPrestigeReputationPreview(academyOnly)).toMatchObject({ nationalWin: false, points: 7 });
  // The n-th point of the Fama arrives at 128 × n² (128, 512, 1.152 …): 1,25 × √(Fama/200).
  expect(getPrestigeReputationPreview({ ...ready, school: { ...ready.school, fame: 128 } }).famePoints).toBe(1);
  expect(getPrestigeReputationPreview({ ...ready, school: { ...ready.school, fame: 1_152 } }).famePoints).toBe(3);
  expect(getPrestigeReputationPreview({ ...ready, school: { ...ready.school, fame: 10_000 } }).famePoints).toBe(8);

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
  expect(getPrestigeReputationPreview(decorated)).toMatchObject({ points: 15, reptileWin: "superba" });
});

it("spends points for good: permanent upgrades stay, rent points only lock this school's rent", () => {
  const first = foundSchool(readySchool(), details, 2_000, { upgrades: { writing: 2 }, rent: 4 });
  // 9 points earned (1 + 2 + √(5.000/128)), 6 spent.
  expect(first.network.reputation).toBe(3);
  expect(first.network.reputationUpgrades?.writing).toBe(2);
  expect(getReputationMultiplier(first, "writing")).toBeCloseTo(1.4);
  expect(first.player.writingPower).toBeCloseTo(1.4);
  // 125 members × 40 € × 10% = 500 € of rent value; 4 points = 40% = 200 €.
  expect(first.network.monthlyRent).toBe(200);
  // The map keeps name, city and the Fama the school had.
  expect(first.network.schools).toEqual([{ name: "Ordine delle Onde", city: "Genova", fame: 5_000 }]);
  expect(first.network.schoolCount).toBe(1);
  expect(first.school.fame).toBe(0);

  // The next school starts again from 0% rent: 5 more points add 50% of its own value.
  const second = foundSchool(readySchool(first), details, 3_000, { upgrades: {}, rent: 5 });
  expect(second.network.monthlyRent).toBe(450);
  expect(second.network.schools.map((entry) => entry.name)).toEqual(["Ordine delle Onde", "Ordine del Faro"]);
  expect(second.network.reputationUpgrades?.writing).toBe(2);

  // No rent points: no new rent, the old ones stay.
  const third = foundSchool(readySchool(second), details, 4_000);
  expect(getMonthlyNetworkRent(third)).toBe(450);
  expect(third.network.reputation).toBe(16);
});

it("refuses the foundation when the spending is not covered or exceeds a cap", () => {
  const ready = readySchool();
  expect(foundSchool(ready, details, 2_000, { upgrades: {}, rent: 10 })).toBe(ready);
  expect(foundSchool(ready, details, 2_000, { upgrades: { training: -1 }, rent: 0 })).toBe(ready);
  const nearlyMaxed = {
    ...ready,
    network: { ...ready.network, reputation: 10, reputationUpgrades: { enrollment: 48 } },
  };
  expect(foundSchool(nearlyMaxed, details, 2_000, { upgrades: { enrollment: 3 }, rent: 0 })).toBe(nearlyMaxed);
  // The rent has no cap: it is where the reputation goes once the upgrades are full.
  expect(foundSchool(nearlyMaxed, details, 2_000, { upgrades: {}, rent: 15 }).network.monthlyRent).toBe(750);
});

it("adds the fixed rents to the monthly income without multipliers", () => {
  const initial = createInitialState(1_000, "Tester");
  const withNetwork = {
    ...initial,
    network: { ...initial.network, monthlyRent: 1_200, reputationUpgrades: { socialGadgets: 10 } },
  };
  expect(getMonthlyNetworkRent(withNetwork)).toBe(1_200);
  expect(getMonthlyOperationalIncome(withNetwork) - getMonthlyOperationalIncome(initial)).toBe(1_200);
});

it("moves the Quote mensili points to Social e Gadget (v94)", () => {
  const initial = createInitialState(1_000, "Tester");
  const saved = { ...initial, version: 93, network: { ...initial.network, reputationUpgrades: { membershipFees: 4, events: 2 } } };
  const migrated = migrate(saved) as GameState;
  expect(migrated.version).toBe(GAME_CONFIG.version);
  expect(migrated.network.reputationUpgrades).toEqual({ socialGadgets: 4, events: 2 });
});

it("turns the old reputation into points and stops the automatic rents (v86)", () => {
  const initial = createInitialState(1_000, "Tester");
  const saved = { ...initial, version: 85, network: { ...initial.network, reputation: 4, reputationUpgrades: undefined, schools: [legacySchool(1_000)] } };
  const migrated = migrate(saved) as GameState;
  expect(migrated.version).toBe(GAME_CONFIG.version);
  expect(migrated.network.reputation).toBe(4);
  expect(migrated.network.reputationUpgrades).toEqual({});
  expect(migrated.network.monthlyRent).toBe(0);
  expect(migrated.school.fame).toBe(initial.school.fame);
});

it("lightens the network for the map (v91): name and city, count, total rent, at most 50 schools", () => {
  const initial = createInitialState(1_000, "Tester");
  const schools = Array.from({ length: 60 }, (_, index) => legacySchool(10, `Scuola ${index + 1}`));
  const saved = {
    ...initial,
    version: 90,
    school: { ...initial.school, motto: "Ogni onda", specialization: "redazione" },
    network: { ...initial.network, reputation: 1, reputationUpgrades: { trialBooking: 3, athleticPreparation: 2, writing: 4 }, schools },
  };
  const migrated = migrate(saved) as GameState;
  expect(migrated.version).toBe(GAME_CONFIG.version);
  expect(migrated.school).not.toHaveProperty("motto");
  expect(migrated.school).not.toHaveProperty("specialization");
  // Lezioni di prova is gone: its points come back; Capacità di miglioramento becomes Genetica.
  expect(migrated.network.reputation).toBe(4);
  expect(migrated.network.reputationUpgrades).toEqual({ writing: 4, genetics: 2 });
  expect(migrated.network).toMatchObject({ schoolCount: 60, monthlyRent: 600 });
  expect(migrated.network.schools).toHaveLength(GAME_CONFIG.networkMapSchoolsLimit);
  expect(migrated.network.schools[0]).toEqual({ name: "Scuola 1", city: "Genova" });
  expect(migrated.network.schools.at(-1)).toEqual({ name: "Scuola 60", city: "Genova" });
});

it("keeps the Sede madre and the latest schools on the map", () => {
  let schools: GameState["network"]["schools"] = [];
  for (let index = 1; index <= 60; index += 1) schools = addSchoolToMap(schools, { name: `${index}`, city: "X", fame: index });
  expect(schools).toHaveLength(50);
  expect(schools.map((school) => school.name).slice(0, 3)).toEqual(["1", "12", "13"]);
  expect(schools.at(-1)?.name).toBe("60");
});

it("raises the base values by 20% a point, probabilities up to their maximum", () => {
  const initial = createInitialState(1_000, "Tester");
  const boosted = (levels: GameState["network"]["reputationUpgrades"]): GameState => ({
    ...initial,
    network: { ...initial.network, reputationUpgrades: levels },
  });
  const levelled = boosted({ writing: 5, events: 5, enrollment: 2, training: 10, genetics: 2 });

  // Email/Social: characters per input, for the player and for Redazione and Social.
  expect(getWritingPower(levelled)).toBeCloseTo(getWritingPower(initial) * 2);
  // Eventi: more contacts at every event.
  expect(getEventContactMultiplier(levelled)).toBeCloseTo(getEventContactMultiplier(initial) * 2);
  // Iscrizioni: 62.5% enrollment base × 1.4 = 87.5%; the booking chance has no branch any more.
  expect(getEnrollmentChance(levelled, "common")).toBeCloseTo(0.875);
  expect(getEmailBookingChance(levelled, "common")).toBeCloseTo(getEmailBookingChance(initial, "common"));
  expect(getEnrollmentChance(boosted({ enrollment: 50 }), "common")).toBeCloseTo(1);

  // Formazione: every course, staff included, three times as fast at 10 points.
  const course = { formId: "form-1" as const, startedAt: 0, completesAt: 0 };
  const instructorCourse = { ...course, trainingTrack: "instructor" as const };
  for (const training of [course, instructorCourse]) {
    expect(getTrainingDurationMultiplier(levelled, "x", training)).toBeCloseTo(
      getTrainingDurationMultiplier(initial, "x", training) / 3,
    );
  }

  // Genetica: new athletes are born with higher base values.
  const plain = rollAthleteBaseStats(7, "common");
  const gifted = rollAthleteBaseStats(7, "common", undefined, getReputationMultiplier(levelled, "genetics"));
  expect(gifted.arena).toBe(Math.round(plain.arena * 1.4));
  expect(gifted.style).toBe(Math.round(plain.style * 1.4));

  const withMembers = addAdminMembers(initial, 50);
  const withFollowers = {
    ...withMembers,
    unlocks: { ...withMembers.unlocks, social: true },
    school: { ...withMembers.school, followers: 1_000 },
  };
  const socialUp = { ...withFollowers, network: { ...withFollowers.network, reputationUpgrades: { socialGadgets: 3 } } };
  // Social e Gadget: the Social income grows, the member fees do not.
  expect(getMonthlySocialIncome(withFollowers)).toBeGreaterThan(0);
  expect(getMonthlySocialIncome(socialUp)).toBeCloseTo(getMonthlySocialIncome(withFollowers) * 1.6);
  expect(getMonthlyMemberFees(socialUp)).toBe(getMonthlyMemberFees(withFollowers));
  expect(getMonthlyOperationalIncome(socialUp) - getMonthlyOperationalIncome(withFollowers))
    .toBeCloseTo(getMonthlySocialIncome(withFollowers) * 0.6);
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
  expect(getDiscoveredLegendaryIds({ network: state.network, legendaryCollaborators: { ...state.legendaryCollaborators, enrolledProfileIds: [] } }))
    .toContain("marco-palena");
});

it("keeps the tutorial scenes already finished in the next school", () => {
  const ready = readySchool();
  const seen = {
    ...ready,
    tutorial: { completedSceneIds: ["first-invitation"], skippedSceneIds: ["first-event"], triggeredSceneIds: ["x"] },
  };
  expect(foundSchool(seen, details, 2_000).tutorial).toEqual({
    completedSceneIds: ["first-invitation"],
    skippedSceneIds: ["first-event"],
    triggeredSceneIds: [],
  });
});

it("brings one random Leggendario of the old school as the only member of the new one", () => {
  const ready = readySchool();
  const legendary = ready.contacts.find((contact) => contact.specialProfileId) ??
    { ...ready.contacts[0], rarity: "legendary" as const, specialProfileId: SPECIAL_COLLABORATORS[0].id };
  const withLegendary: GameState = {
    ...ready,
    contacts: [
      ...ready.contacts.filter((contact) => contact.id !== legendary.id),
      { ...legendary, status: "enrolled", training: undefined },
    ],
  };
  const next = foundSchool(withLegendary, details, 2_000);
  const members = next.contacts.filter((contact) => contact.status === "enrolled");
  expect(members).toHaveLength(1);
  const followerId = members[0].specialProfileId;
  expect(members[0].forms).toEqual([]);
  expect(withLegendary.contacts.some((contact) =>
    contact.status === "enrolled" && contact.specialProfileId === followerId,
  )).toBe(true);
  expect(next.school.activeMembers).toBe(1);
  expect(next.legendaryCollaborators.enrolledProfileIds).toEqual([followerId]);
  expect(next.contacts.filter((contact) => contact.specialProfileId === followerId)).toHaveLength(1);
});

it("restarts the Missioni delle Onde from series 1 at every new school", () => {
  const ready = readySchool();
  const advanced = {
    ...ready,
    statistics: { ...ready.statistics, emailsSent: 40 },
    shortGoal: { ...ready.shortGoal, definitionId: "book-trials" as const, completedCount: 21, target: 6 },
  };
  const founded = foundSchool(advanced, details, 2_000);
  expect(founded.shortGoal).toMatchObject({
    definitionId: "send-emails",
    completedCount: 0,
    target: 2,
    baseline: founded.statistics.emailsSent,
  });
  // Events are already open in a new school: no "Si esce dalla palestra" message.
  const completed = completeShortGoal({
    ...founded,
    school: { ...founded.school, euros: 0 },
    statistics: { ...founded.statistics, emailsSent: founded.statistics.emailsSent + 2 },
  }, 3_000, 1);
  expect(completed.shortGoal.completedCount).toBe(1);
  expect(completed.messages.some((message) => message.subject === "Si esce dalla palestra")).toBe(false);
});
