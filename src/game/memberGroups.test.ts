import { describe, expect, it } from "vitest";
import { createInitialCollaboratorMastery } from "../content/mastery";
import { getFormTrainingYear } from "./calendar";
import { GAME_CONFIG } from "./config";
import { createInitialState, gameReducer } from "./engine";
import { getCurrentSchoolContactCount } from "./historyArchive";
import {
  countEnrolledContacts,
  departGroupedMembers,
  getGroupedMemberCount,
  groupExcessMembers,
  materializeGroupedMembers,
  sampleBinomial,
} from "./memberGroups";
import { getMonthlyMemberFees } from "./membershipEconomy";
import { loadGame, saveGame } from "./save";
import type { Collaborator, Contact, GameState, MemberGroup } from "./types";

const NOW = 1_800_000_000_000;
const LIMIT = GAME_CONFIG.materialEnrolledMembersLimit;

function withMembers(amount: number): GameState {
  return gameReducer(createInitialState(NOW, "Andrea", false), {
    type: "ADMIN_ADD_MEMBERS",
    amount,
  });
}

function memberCount(state: GameState): number {
  return countEnrolledContacts(state.contacts) + getGroupedMemberCount(state);
}

describe("member groups", () => {
  it("keeps the strongest members as people and the counters consistent", () => {
    const state = withMembers(LIMIT + 500);

    expect(countEnrolledContacts(state.contacts)).toBe(LIMIT);
    expect(memberCount(state)).toBe(state.school.activeMembers);
    expect(getCurrentSchoolContactCount(state)).toBe(state.contacts.length + 500);
  });

  it("groups the weakest ordinary members and leaves favorites and legends alone", () => {
    const base = withMembers(LIMIT);
    const people = base.contacts.filter((contact) => contact.status === "enrolled");
    const weakFavorite: Contact = { ...people[0], id: "weak-favorite", favorite: true,
      arenaBase: 1, styleBase: 1 };
    const weakLegend: Contact = { ...people[0], id: "weak-legend", rarity: "legendary",
      arenaBase: 1, styleBase: 1 };
    const weakest: Contact = { ...people[0], id: "weakest", rarity: "common",
      arenaBase: 0, styleBase: 0 };
    const state: GameState = {
      ...base,
      contacts: [...base.contacts, weakFavorite, weakLegend, weakest],
      school: { ...base.school, activeMembers: base.school.activeMembers + 3 },
    };
    const feesBefore = getMonthlyMemberFees(state);

    const grouped = groupExcessMembers(state);
    const ids = new Set(grouped.contacts.map((contact) => contact.id));

    expect(ids.has("weak-favorite")).toBe(true);
    expect(ids.has("weak-legend")).toBe(true);
    expect(ids.has("weakest")).toBe(false);
    expect(memberCount(grouped)).toBe(grouped.school.activeMembers);
    expect(getMonthlyMemberFees(grouped)).toBe(feesBefore);
  });

  it("groups members with weapon preferences and gives them back", () => {
    const base = withMembers(LIMIT);
    const people = base.contacts.filter((contact) => contact.status === "enrolled");
    const weakest: Contact = { ...people[0], id: "weakest-staff", rarity: "common",
      arenaBase: 0, styleBase: 0, formBranchPreferences: ["Staffa", "Spada Lunga"] };
    const state: GameState = {
      ...base,
      contacts: [...base.contacts, weakest],
      school: { ...base.school, activeMembers: base.school.activeMembers + 1 },
    };

    const grouped = groupExcessMembers(state);
    expect(grouped.contacts.some((contact) => contact.id === "weakest-staff")).toBe(false);
    const group = grouped.memberGroups?.find((candidate) => candidate.formBranchPreferences);
    expect(group?.formBranchPreferences).toEqual(["Staffa", "Spada Lunga"]);

    const back = materializeGroupedMembers(grouped, 1, NOW, () => 0,
      (candidate) => candidate === group);
    expect(back.contacts.at(-1)?.formBranchPreferences).toEqual(["Staffa", "Spada Lunga"]);
  });

  it("groups Corso Agonisti members too, keeping the strongest with their bonuses", () => {
    const base = withMembers(LIMIT);
    const people = base.contacts.filter((contact) => contact.status === "enrolled");
    const trainingYear = getFormTrainingYear(base.school.currentMonth);
    const weakAgonist: Contact = { ...people[0], id: "weak-agonist", rarity: "common",
      arenaBase: 0, styleBase: 0, agonistCourseCompletions: 2, agonistCourseArenaBonus: 1,
      agonistCourseStyleBonus: 1, lastAgonistCourseYear: trainingYear };
    // Weak by nature, strong thanks to the courses: stays a person.
    const coursedChampion: Contact = { ...people[0], id: "coursed-champion", rarity: "common",
      arenaBase: 0, styleBase: 0, agonistCourseCompletions: 6, agonistCourseArenaBonus: 500,
      agonistCourseStyleBonus: 500 };
    const state: GameState = {
      ...base,
      contacts: [...base.contacts, weakAgonist, coursedChampion],
      school: { ...base.school, activeMembers: base.school.activeMembers + 2 },
    };

    const grouped = groupExcessMembers(state);
    const ids = new Set(grouped.contacts.map((contact) => contact.id));
    expect(ids.has("weak-agonist")).toBe(false);
    expect(ids.has("coursed-champion")).toBe(true);
    const group = grouped.memberGroups?.find((candidate) => candidate.lastAgonistCourseYear);
    expect(group?.lastAgonistCourseYear).toBe(trainingYear);

    const back = materializeGroupedMembers(grouped, 1, NOW, () => 0,
      (candidate) => candidate === group);
    const member = back.contacts.at(-1);
    expect(member?.lastAgonistCourseYear).toBe(trainingYear);
    expect(member?.agonistCourseCompletions).toBe(0);
    expect(member?.agonistCourseArenaBonus).toBe(0);
  });

  it("sends grouped members away at the yearly rate and archives them", () => {
    const base = createInitialState(NOW, "Andrea", false);
    const group: MemberGroup = { rarity: "common", source: "event", forms: [], count: 100_000 };
    const state: GameState = {
      ...base,
      school: { ...base.school, activeMembers: 100_000, currentMonth: 30 },
      memberGroups: [group],
    };

    const { state: after, departed } = departGroupedMembers(state, () => 0.8);

    expect(departed).toBeGreaterThan(79_000);
    expect(departed).toBeLessThan(81_000);
    expect(after.school.activeMembers).toBe(100_000 - departed);
    expect(getGroupedMemberCount(after)).toBe(100_000 - departed);
    expect(after.historyArchive.contactsBySource.event.total)
      .toBe(base.historyArchive.contactsBySource.event.total + departed);
  });

  it("protects groups enrolled this school year or trained this year", () => {
    const base = createInitialState(NOW, "Andrea", false);
    const state: GameState = {
      ...base,
      school: { ...base.school, activeMembers: 20, currentMonth: 30 },
      memberGroups: [
        { rarity: "common", source: "event", forms: [], recentEnrolledMonth: 26, count: 10 },
        { rarity: "common", source: "social", forms: ["form-1"], lastFormTrainingYear: 2,
          formTrainingYearCount: 1, count: 10 },
      ],
    };

    expect(departGroupedMembers(state, () => 1).departed).toBe(0);
  });

  it("gives free course places to grouped members", () => {
    const initial = createInitialState(1_000);
    const teacher: Collaborator = {
      id: "teacher",
      contactId: "external-teacher",
      displayName: "teacher",
      joinedAt: 1_000,
      forms: ["form-1"],
      instructorForms: ["form-1"],
      formBranchPreferences: [],
      assignment: "instructor",
      mastery: createInitialCollaboratorMastery(),
      rarity: "legendary",
    };
    const state: GameState = {
      ...initial,
      school: { ...initial.school, activeMembers: 50, euros: 10_000 },
      contacts: [],
      collaborators: [teacher],
      memberGroups: [{ rarity: "common", source: "event", forms: [], count: 50 }],
      unlocks: { ...initial.unlocks, forms: true },
      upgrades: { ...initial.upgrades, "promiscuous-instructor": 5 },
    };

    const ticked = gameReducer(state, { type: "TICK", now: 2_000 });
    const inTraining = ticked.contacts.filter((contact) => contact.training);

    expect(inTraining).toHaveLength(6);
    expect(getGroupedMemberCount(ticked)).toBe(44);
    expect(memberCount(ticked)).toBe(ticked.school.activeMembers);
  });

  it("survives a save and load", () => {
    const state = withMembers(LIMIT + 50);

    expect(saveGame(state, NOW)).toBe(true);
    const loaded = loadGame(NOW);

    expect(loaded.memberGroups).toEqual(state.memberGroups);
    expect(memberCount(loaded)).toBe(state.school.activeMembers);
  });

  it("samples a binomial close to its mean", () => {
    const [small] = sampleBinomial(10, 0, 1);
    const [all] = sampleBinomial(10, 1, 1);
    const [large] = sampleBinomial(1_000_000, 0.25, 7);

    expect(small).toBe(0);
    expect(all).toBe(10);
    expect(Math.abs(large - 250_000)).toBeLessThan(3_000);
  });
});
